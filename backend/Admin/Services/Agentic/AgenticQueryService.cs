using Admin.DTOs;
using System.Globalization;
using System.Text;

namespace Admin.Services.Agentic
{
    public class AgenticQueryService
    {
        private readonly AgenticHrmTool _hrmTool;
        private readonly AttendanceTool _attendanceTool;
        private readonly LeaveTool _leaveTool;
        private readonly SalaryTool _salaryTool;
        private readonly TaskTool _taskTool;
        private readonly AgenticLlmService _llmService;

        public AgenticQueryService(
            AgenticHrmTool hrmTool,
            AttendanceTool attendanceTool,
            LeaveTool leaveTool,
            SalaryTool salaryTool,
            TaskTool taskTool,
            AgenticLlmService llmService)
        {
            _hrmTool = hrmTool;
            _attendanceTool = attendanceTool;
            _leaveTool = leaveTool;
            _salaryTool = salaryTool;
            _taskTool = taskTool;
            _llmService = llmService;
        }

        public async Task<AgenticAiQueryResponseDto> QueryAsync(AgenticAiQueryRequestDto request)
        {
            ValidateRequest(request);

            var scopeRequest = new AgenticAiRunRequestDto
            {
                ManagerId = request.ManagerId,
                Month = request.Month,
                Year = request.Year,
                Goal = request.Question
            };
            var employees = await _hrmTool.GetTargetEmployeesAsync(scopeRequest);
            var fallbackEmployees = FindEmployeesInQuestion(employees, request.Question);
            var fallbackEmployee = fallbackEmployees.FirstOrDefault();
            var fallbackIntentType = DetectIntent(request.Question);
            var fallbackIntent = new AgenticToolIntentDto
            {
                IsSupported = fallbackIntentType != null,
                Tool = fallbackIntentType?.Tool ?? "",
                Metric = fallbackIntentType?.Metric ?? "",
                EmployeeName = fallbackEmployee?.FullName ?? "",
                EmployeeNames = fallbackEmployees.Select(employee => employee.FullName).ToList()
            };

            var shouldAskIntentAgent = HasMultipleEmployeeConnector(request.Question);
            var intentResult = fallbackIntent.IsSupported
                && fallbackEmployees.Count > 0
                && !shouldAskIntentAgent
                ? new AgenticLlmResult<AgenticToolIntentDto>(
                    fallbackIntent,
                    false,
                    "Intent đã được backend xác định chắc chắn; dành lượt gọi mô hình cho Response Agent.")
                : await _llmService.ParseDataQueryIntentAsync(request.Question, fallbackIntent);
            var intent = intentResult.Value;
            ValidateIntent(intent);

            var requestedNames = GetRequestedEmployeeNames(intent);
            var unresolvedNames = requestedNames
                .Where(name => ResolveEmployee(employees, name) == null)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (unresolvedNames.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Không thể truy vấn đầy đủ vì nhân viên không tồn tại hoặc nằm ngoài phạm vi quản lý: {string.Join(", ", unresolvedNames)}.");
            }

            var targetEmployees = ResolveEmployees(employees, intent, fallbackEmployees);
            if (targetEmployees.Count == 0)
            {
                throw new InvalidOperationException(
                    "Không tìm thấy nhân viên trong phạm vi quản lý. Hãy nhập đủ họ tên hoặc kèm phòng ban.");
            }

            var llm = _llmService.GetStatus();
            llm.WasUsed = intentResult.Used;
            llm.Notes.Add(intentResult.Message);

            if (string.Equals(intent.Tool, "AttendanceLeaveTool", StringComparison.OrdinalIgnoreCase))
            {
                return await BuildAttendanceLeaveResponseAsync(
                    request,
                    targetEmployees,
                    llm,
                    intentResult.Used);
            }

            if (string.Equals(intent.Tool, "LeaveTool", StringComparison.OrdinalIgnoreCase))
            {
                return await BuildLeaveSummaryResponseAsync(
                    request,
                    targetEmployees,
                    llm,
                    intentResult.Used);
            }

            if (string.Equals(intent.Tool, "AttendanceTool", StringComparison.OrdinalIgnoreCase)
                && string.Equals(intent.Metric, "attendance_summary", StringComparison.OrdinalIgnoreCase))
            {
                return await BuildWorkHoursSummaryResponseAsync(
                    request,
                    targetEmployees,
                    llm,
                    intentResult.Used);
            }

            if (string.Equals(intent.Tool, "SalaryTool", StringComparison.OrdinalIgnoreCase))
            {
                return targetEmployees.Count == 1
                    ? await BuildSalaryResponseAsync(request, intent, targetEmployees[0], llm, intentResult.Used)
                    : await BuildSalaryComparisonResponseAsync(request, intent, targetEmployees, llm, intentResult.Used);
            }

            if (string.Equals(intent.Tool, "TaskTool", StringComparison.OrdinalIgnoreCase))
            {
                return targetEmployees.Count == 1
                    ? await BuildTaskResponseAsync(request, intent, targetEmployees[0], llm, intentResult.Used)
                    : await BuildTaskComparisonResponseAsync(request, targetEmployees, llm, intentResult.Used);
            }

            return targetEmployees.Count == 1
                ? await BuildAttendanceResponseAsync(request, intent, targetEmployees[0], llm, intentResult.Used)
                : await BuildAttendanceComparisonResponseAsync(request, targetEmployees, llm, intentResult.Used);
        }

        private async Task<AgenticAiQueryResponseDto> BuildAttendanceResponseAsync(
            AgenticAiQueryRequestDto request,
            AgenticToolIntentDto intent,
            TargetEmployeeDto employee,
            AgenticLlmStatusDto llm,
            bool llmUsed)
        {
            var evidence = await _attendanceTool.GetLateDaysAsync(employee, request.Month, request.Year);
            var lateDetails = evidence.LateDates.Count == 0
                ? "Không có ngày nào đi trễ theo lịch ca."
                : string.Join(", ", evidence.LateDates.Select(item =>
                    $"{item.Date:dd/MM} vào {item.CheckInTime}, ca {item.ExpectedStartTime} (trễ {item.LateMinutes} phút)"));
            var fallbackAnswer = $"{evidence.EmployeeName} đi trễ {evidence.LateDays} ngày trong tháng " +
                $"{request.Month:00}/{request.Year}, trên {evidence.AttendanceDays} ngày có chấm công. {lateDetails}";
            var answerResult = await _llmService.ComposeGroundedAnswerAsync(
                request.Question,
                "AttendanceTool",
                evidence,
                new AgenticGroundedAnswerDto
                {
                    Answer = fallbackAnswer,
                    EmployeeId = employee.Id,
                    EmployeeIds = new List<int> { employee.Id },
                    Tool = "AttendanceTool",
                    PrimaryValue = evidence.LateDays,
                    SecondaryValue = evidence.AttendanceDays,
                    RecordCount = evidence.LateDates.Count
                });
            llm.WasUsed = llm.WasUsed || answerResult.Used;
            llm.Notes.Add($"Response Agent: {answerResult.Message}");

            return new AgenticAiQueryResponseDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Question = request.Question.Trim(),
                Answer = answerResult.Value.Answer,
                Intent = new AgenticToolIntentDto
                {
                    IsSupported = true,
                    Tool = "AttendanceTool",
                    Metric = "late_days",
                    EmployeeName = employee.FullName,
                    EmployeeNames = new List<string> { employee.FullName }
                },
                Evidence = evidence,
                AttendanceEvidences = new List<AgenticAttendanceEvidenceDto> { evidence },
                Llm = llm,
                Trace = new List<AgenticTraceDto>
                {
                    new()
                    {
                        Agent = "HR AI Orchestrator",
                        Action = "Hiểu câu hỏi",
                        Result = llmUsed
                            ? $"{llm.Provider} đã chọn AttendanceTool và chỉ số late_days."
                            : "Bộ phân tích dự phòng đã chọn AttendanceTool và chỉ số late_days.",
                        CreatedAt = DateTime.Now
                    },
                    new()
                    {
                        Agent = "AttendanceTool",
                        Action = "Truy vấn dữ liệu chấm công",
                        Result = $"Đã đọc {evidence.AttendanceDays} bản ghi hợp lệ và tìm thấy {evidence.LateDays} ngày đi trễ.",
                        CreatedAt = DateTime.Now
                    },
                    new()
                    {
                        Agent = "Validation Agent",
                        Action = "Đối chiếu bằng chứng",
                        Result = "Số ngày đi trễ khớp giờ check-in, lịch ca và thời gian cho phép.",
                        CreatedAt = DateTime.Now
                    },
                    new()
                    {
                        Agent = "Response Agent",
                        Action = "Diễn đạt kết quả",
                        Result = answerResult.Used
                            ? $"{llm.Provider} đã diễn đạt câu trả lời tự nhiên từ bằng chứng đã xác minh."
                            : "Đã dùng câu trả lời dự phòng do mô hình AI không khả dụng.",
                        CreatedAt = DateTime.Now
                    }
                }
            };
        }

        private async Task<AgenticAiQueryResponseDto> BuildSalaryResponseAsync(
            AgenticAiQueryRequestDto request,
            AgenticToolIntentDto intent,
            TargetEmployeeDto employee,
            AgenticLlmStatusDto llm,
            bool llmUsed)
        {
            var isPeriodQuery = string.Equals(intent.Metric, "salary_period", StringComparison.OrdinalIgnoreCase);
            var evidence = await _salaryTool.GetSalaryHistoryAsync(
                employee,
                isPeriodQuery ? request.Month : null,
                isPeriodQuery ? request.Year : null);
            var culture = CultureInfo.GetCultureInfo("vi-VN");
            var periodDetails = evidence.Periods.Count == 0
                ? "Chưa có kỳ lương nào trong payroll."
                : string.Join(", ", evidence.Periods.Select(item =>
                    $"{item.Month:00}/{item.Year}: {item.NetSalary.ToString("N0", culture)} đ ({item.Status})"));
            var fallbackAnswer = isPeriodQuery
                ? $"Lương kỳ {request.Month:00}/{request.Year} của {evidence.EmployeeName}: {periodDetails}"
                : $"{evidence.EmployeeName} đã được thanh toán " +
                  $"{evidence.PaidNetSalary.ToString("N0", culture)} đ qua {evidence.PaidPeriods} kỳ. " +
                  $"Còn {evidence.PendingPeriods} kỳ chưa thanh toán, tổng " +
                  $"{evidence.PendingNetSalary.ToString("N0", culture)} đ. Chi tiết: {periodDetails}";
            var answerResult = await _llmService.ComposeGroundedAnswerAsync(
                request.Question,
                "SalaryTool",
                evidence,
                new AgenticGroundedAnswerDto
                {
                    Answer = fallbackAnswer,
                    EmployeeId = employee.Id,
                    EmployeeIds = new List<int> { employee.Id },
                    Tool = "SalaryTool",
                    PrimaryValue = isPeriodQuery ? evidence.RecordedNetSalary : evidence.PaidNetSalary,
                    SecondaryValue = evidence.PendingNetSalary,
                    RecordCount = evidence.TotalPeriods
                });
            llm.WasUsed = llm.WasUsed || answerResult.Used;
            llm.Notes.Add($"Response Agent: {answerResult.Message}");

            return new AgenticAiQueryResponseDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Question = request.Question.Trim(),
                Answer = answerResult.Value.Answer,
                Intent = new AgenticToolIntentDto
                {
                    IsSupported = true,
                    Tool = "SalaryTool",
                    Metric = intent.Metric,
                    EmployeeName = employee.FullName,
                    EmployeeNames = new List<string> { employee.FullName }
                },
                SalaryEvidence = evidence,
                SalaryEvidences = new List<AgenticSalaryEvidenceDto> { evidence },
                Llm = llm,
                Trace = new List<AgenticTraceDto>
                {
                    new()
                    {
                        Agent = "HR AI Orchestrator",
                        Action = "Hiểu câu hỏi",
                        Result = llmUsed
                            ? $"{llm.Provider} đã chọn SalaryTool và chỉ số total_salary_history."
                            : "Bộ phân tích dự phòng đã chọn SalaryTool và chỉ số total_salary_history.",
                        CreatedAt = DateTime.Now
                    },
                    new()
                    {
                        Agent = "SalaryTool",
                        Action = "Truy vấn lịch sử payroll",
                        Result = $"Đã đọc {evidence.TotalPeriods} kỳ lương của nhân viên #{employee.Id}.",
                        CreatedAt = DateTime.Now
                    },
                    new()
                    {
                        Agent = "Validation Agent",
                        Action = "Đối chiếu tổng lương",
                        Result = "Đã cộng từng kỳ theo NetSalary và tách kỳ đã thanh toán khỏi kỳ đang chờ.",
                        CreatedAt = DateTime.Now
                    },
                    new()
                    {
                        Agent = "Response Agent",
                        Action = "Diễn đạt kết quả",
                        Result = answerResult.Used
                            ? $"{llm.Provider} đã diễn đạt câu trả lời tự nhiên từ bằng chứng đã xác minh."
                            : "Đã dùng câu trả lời dự phòng do mô hình AI không khả dụng.",
                        CreatedAt = DateTime.Now
                    }
                }
            };
        }

        private async Task<AgenticAiQueryResponseDto> BuildTaskResponseAsync(
            AgenticAiQueryRequestDto request,
            AgenticToolIntentDto intent,
            TargetEmployeeDto employee,
            AgenticLlmStatusDto llm,
            bool llmUsed)
        {
            var evidence = await _taskTool.GetTaskSummaryAsync(employee, request.Month, request.Year);
            var qualityText = evidence.AverageQualityScore.HasValue
                ? $" Điểm chất lượng trung bình là {evidence.AverageQualityScore.Value:N2}."
                : " Chưa có điểm review chất lượng.";
            var taskDetails = evidence.Tasks.Count == 0
                ? "Không có task nào có deadline trong kỳ."
                : string.Join(", ", evidence.Tasks.Select(item =>
                    $"{item.Title} ({item.Status}, {item.ProgressPercent}%, deadline {item.Deadline:dd/MM})"));
            var fallbackAnswer = $"Trong tháng {request.Month:00}/{request.Year}, {evidence.EmployeeName} có " +
                $"{evidence.TotalTasks} task: {evidence.ApprovedTasks} đã hoàn thành, " +
                $"{evidence.InProgressTasks} đang thực hiện, {evidence.SubmittedTasks} chờ duyệt, " +
                $"{evidence.RevisionTasks} cần sửa và {evidence.OverdueTasks} quá hạn. " +
                $"Tiến độ trung bình {evidence.AverageProgress:N2}%.{qualityText} Chi tiết: {taskDetails}";
            var answerResult = await _llmService.ComposeGroundedAnswerAsync(
                request.Question,
                "TaskTool",
                evidence,
                new AgenticGroundedAnswerDto
                {
                    Answer = fallbackAnswer,
                    EmployeeId = employee.Id,
                    EmployeeIds = new List<int> { employee.Id },
                    Tool = "TaskTool",
                    PrimaryValue = evidence.TotalTasks,
                    SecondaryValue = evidence.ApprovedTasks,
                    RecordCount = evidence.Tasks.Count
                });
            llm.WasUsed = llm.WasUsed || answerResult.Used;
            llm.Notes.Add($"Response Agent: {answerResult.Message}");

            return new AgenticAiQueryResponseDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Question = request.Question.Trim(),
                Answer = answerResult.Value.Answer,
                Intent = new AgenticToolIntentDto
                {
                    IsSupported = true,
                    Tool = "TaskTool",
                    Metric = "task_summary",
                    EmployeeName = employee.FullName,
                    EmployeeNames = new List<string> { employee.FullName }
                },
                TaskEvidence = evidence,
                TaskEvidences = new List<AgenticTaskEvidenceDto> { evidence },
                Llm = llm,
                Trace = new List<AgenticTraceDto>
                {
                    new()
                    {
                        Agent = "HR AI Orchestrator",
                        Action = "Hiểu câu hỏi",
                        Result = llmUsed
                            ? $"{llm.Provider} đã chọn TaskTool và chỉ số task_summary."
                            : "Bộ định tuyến đã chọn TaskTool và chỉ số task_summary.",
                        CreatedAt = DateTime.Now
                    },
                    new()
                    {
                        Agent = "TaskTool",
                        Action = "Truy vấn task theo kỳ",
                        Result = $"Đã đọc {evidence.TotalTasks} task có deadline trong {request.Month:00}/{request.Year}.",
                        CreatedAt = DateTime.Now
                    },
                    new()
                    {
                        Agent = "Validation Agent",
                        Action = "Đối chiếu trạng thái task",
                        Result = "Đã kiểm tra tổng task, trạng thái, tiến độ, deadline và review mới nhất.",
                        CreatedAt = DateTime.Now
                    },
                    new()
                    {
                        Agent = "Response Agent",
                        Action = "Diễn đạt kết quả",
                        Result = answerResult.Used
                            ? $"{llm.Provider} đã diễn đạt câu trả lời tự nhiên từ dữ liệu task đã xác minh."
                            : "Đã dùng câu trả lời dự phòng do mô hình AI không khả dụng.",
                        CreatedAt = DateTime.Now
                    }
                }
            };
        }

        private async Task<AgenticAiQueryResponseDto> BuildAttendanceComparisonResponseAsync(
            AgenticAiQueryRequestDto request,
            IReadOnlyList<TargetEmployeeDto> employees,
            AgenticLlmStatusDto llm,
            bool llmUsed)
        {
            var evidences = new List<AgenticAttendanceEvidenceDto>();
            foreach (var employee in employees)
            {
                evidences.Add(await _attendanceTool.GetLateDaysAsync(employee, request.Month, request.Year));
            }
            var employeeNames = employees.Select(employee => employee.FullName).ToList();
            var summaries = evidences.Select(evidence =>
                $"{evidence.EmployeeName}: {evidence.LateDays} ngày đi trễ trên {evidence.AttendanceDays} ngày chấm công");
            var fallbackAnswer =
                $"Trong tháng {request.Month:00}/{request.Year}, {string.Join("; ", summaries)}. " +
                $"Tổng cộng có {evidences.Sum(item => item.LateDays)} lượt đi trễ.";
            var answerResult = await _llmService.ComposeGroundedAnswerAsync(
                request.Question,
                "AttendanceTool",
                evidences,
                new AgenticGroundedAnswerDto
                {
                    Answer = fallbackAnswer,
                    EmployeeId = employees[0].Id,
                    EmployeeIds = employees.Select(employee => employee.Id).ToList(),
                    Tool = "AttendanceTool",
                    PrimaryValue = evidences.Sum(item => item.LateDays),
                    SecondaryValue = evidences.Sum(item => item.AttendanceDays),
                    RecordCount = evidences.Sum(item => item.LateDates.Count)
                });
            llm.WasUsed = llm.WasUsed || answerResult.Used;
            llm.Notes.Add($"Response Agent: {answerResult.Message}");

            return new AgenticAiQueryResponseDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Question = request.Question.Trim(),
                Answer = answerResult.Value.Answer,
                Intent = CreateMultiEmployeeIntent("AttendanceTool", "late_days", employeeNames),
                Evidence = evidences.FirstOrDefault(),
                AttendanceEvidences = evidences,
                Llm = llm,
                Trace = CreateComparisonTrace(
                    "AttendanceTool",
                    employeeNames.Count,
                    $"Đã đọc chấm công của {employeeNames.Count} nhân viên trong {request.Month:00}/{request.Year}.",
                    "Đã đối chiếu từng ngày đi trễ với giờ check-in và lịch ca.",
                    llm,
                    llmUsed,
                    answerResult.Used)
            };
        }

        private async Task<AgenticAiQueryResponseDto> BuildWorkHoursSummaryResponseAsync(
            AgenticAiQueryRequestDto request,
            IReadOnlyList<TargetEmployeeDto> employees,
            AgenticLlmStatusDto llm,
            bool llmUsed)
        {
            var evidences = new List<AgenticWorkHoursEvidenceDto>();
            foreach (var employee in employees)
            {
                evidences.Add(await _attendanceTool.GetWorkHoursSummaryAsync(
                    employee,
                    request.Month,
                    request.Year));
            }

            var employeeNames = employees.Select(employee => employee.FullName).ToList();
            var summaries = evidences.Select(evidence =>
                $"{evidence.EmployeeName}: {evidence.TotalWorkedHours:0.##} giờ trong {evidence.AttendanceDays} ngày chấm công, " +
                $"tăng ca {evidence.OvertimeHours:0.##} giờ, thiếu công {evidence.IncompleteDays} ngày, " +
                $"về sớm {evidence.EarlyLeaveDays} ngày");
            var fallbackAnswer =
                $"Trong tháng {request.Month:00}/{request.Year}, {string.Join("; ", summaries)}.";
            var answerResult = await _llmService.ComposeGroundedAnswerAsync(
                request.Question,
                "AttendanceTool",
                evidences,
                new AgenticGroundedAnswerDto
                {
                    Answer = fallbackAnswer,
                    EmployeeId = employees[0].Id,
                    EmployeeIds = employees.Select(employee => employee.Id).ToList(),
                    Tool = "AttendanceTool",
                    PrimaryValue = evidences.Sum(item => item.TotalWorkedHours),
                    SecondaryValue = evidences.Sum(item => item.OvertimeHours),
                    RecordCount = evidences.Sum(item => item.AttendanceDays)
                });
            llm.WasUsed = llm.WasUsed || answerResult.Used;
            llm.Notes.Add($"Response Agent: {answerResult.Message}");

            return new AgenticAiQueryResponseDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Question = request.Question.Trim(),
                Answer = answerResult.Value.Answer,
                Intent = CreateMultiEmployeeIntent("AttendanceTool", "attendance_summary", employeeNames),
                WorkHoursEvidence = evidences.FirstOrDefault(),
                WorkHoursEvidences = evidences,
                Llm = llm,
                Trace = CreateComparisonTrace(
                    "AttendanceTool",
                    employeeNames.Count,
                    $"Đã đọc {evidences.Sum(item => item.AttendanceDays)} bản ghi chấm công trong kỳ.",
                    "Đã tính giờ công từ check-in/check-out, trừ giờ nghỉ trưa và tách tăng ca, thiếu công, về sớm.",
                    llm,
                    llmUsed,
                    answerResult.Used)
            };
        }

        private async Task<AgenticAiQueryResponseDto> BuildLeaveSummaryResponseAsync(
            AgenticAiQueryRequestDto request,
            IReadOnlyList<TargetEmployeeDto> employees,
            AgenticLlmStatusDto llm,
            bool llmUsed)
        {
            var evidences = new List<AgenticLeaveEvidenceDto>();
            foreach (var employee in employees)
            {
                evidences.Add(await _leaveTool.GetLeaveSummaryAsync(
                    employee,
                    request.Month,
                    request.Year));
            }

            var employeeNames = employees.Select(employee => employee.FullName).ToList();
            var summaries = evidences.Select(evidence =>
                $"{evidence.EmployeeName}: {evidence.ApprovedDays} ngày đã duyệt, " +
                $"{evidence.PendingDays} ngày chờ duyệt, {evidence.RejectedDays} ngày bị từ chối " +
                $"trên {evidence.TotalRequests} đơn");
            var fallbackAnswer =
                $"Trong tháng {request.Month:00}/{request.Year}, {string.Join("; ", summaries)}. " +
                "CSDL chưa có hạn mức phép năm nên chưa thể tính số phép còn lại.";
            var answerResult = await _llmService.ComposeGroundedAnswerAsync(
                request.Question,
                "LeaveTool",
                evidences,
                new AgenticGroundedAnswerDto
                {
                    Answer = fallbackAnswer,
                    EmployeeId = employees[0].Id,
                    EmployeeIds = employees.Select(employee => employee.Id).ToList(),
                    Tool = "LeaveTool",
                    PrimaryValue = evidences.Sum(item => item.ApprovedDays),
                    SecondaryValue = evidences.Sum(item => item.PendingDays),
                    RecordCount = evidences.Sum(item => item.TotalRequests)
                });
            llm.WasUsed = llm.WasUsed || answerResult.Used;
            llm.Notes.Add($"Response Agent: {answerResult.Message}");

            return new AgenticAiQueryResponseDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Question = request.Question.Trim(),
                Answer = answerResult.Value.Answer,
                Intent = CreateMultiEmployeeIntent("LeaveTool", "leave_summary", employeeNames),
                LeaveEvidence = evidences.FirstOrDefault(),
                LeaveEvidences = evidences,
                Llm = llm,
                Trace = CreateComparisonTrace(
                    "LeaveTool",
                    employeeNames.Count,
                    $"Đã đọc {evidences.Sum(item => item.TotalRequests)} đơn nghỉ giao với kỳ đang chọn.",
                    "Đã cắt số ngày theo phạm vi tháng và tách riêng đã duyệt, chờ duyệt, từ chối.",
                    llm,
                    llmUsed,
                    answerResult.Used)
            };
        }

        private async Task<AgenticAiQueryResponseDto> BuildAttendanceLeaveResponseAsync(
            AgenticAiQueryRequestDto request,
            IReadOnlyList<TargetEmployeeDto> employees,
            AgenticLlmStatusDto llm,
            bool llmUsed)
        {
            var workEvidences = new List<AgenticWorkHoursEvidenceDto>();
            var leaveEvidences = new List<AgenticLeaveEvidenceDto>();
            foreach (var employee in employees)
            {
                workEvidences.Add(await _attendanceTool.GetWorkHoursSummaryAsync(
                    employee,
                    request.Month,
                    request.Year));
                leaveEvidences.Add(await _leaveTool.GetLeaveSummaryAsync(
                    employee,
                    request.Month,
                    request.Year));
            }

            var employeeNames = employees.Select(employee => employee.FullName).ToList();
            var summaries = employees.Select((employee, index) =>
                $"{employee.FullName}: làm {workEvidences[index].TotalWorkedHours:0.##} giờ, " +
                $"tăng ca {workEvidences[index].OvertimeHours:0.##} giờ; nghỉ {leaveEvidences[index].ApprovedDays} ngày đã duyệt, " +
                $"{leaveEvidences[index].PendingDays} ngày chờ duyệt");
            var fallbackAnswer =
                $"Trong tháng {request.Month:00}/{request.Year}, {string.Join("; ", summaries)}.";
            var answerResult = await _llmService.ComposeGroundedAnswerAsync(
                request.Question,
                "AttendanceLeaveTool",
                new { workHours = workEvidences, leave = leaveEvidences },
                new AgenticGroundedAnswerDto
                {
                    Answer = fallbackAnswer,
                    EmployeeId = employees[0].Id,
                    EmployeeIds = employees.Select(employee => employee.Id).ToList(),
                    Tool = "AttendanceLeaveTool",
                    PrimaryValue = workEvidences.Sum(item => item.TotalWorkedHours),
                    SecondaryValue = leaveEvidences.Sum(item => item.ApprovedDays),
                    RecordCount = workEvidences.Sum(item => item.AttendanceDays)
                        + leaveEvidences.Sum(item => item.TotalRequests)
                });
            llm.WasUsed = llm.WasUsed || answerResult.Used;
            llm.Notes.Add($"Response Agent: {answerResult.Message}");

            return new AgenticAiQueryResponseDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Question = request.Question.Trim(),
                Answer = answerResult.Value.Answer,
                Intent = CreateMultiEmployeeIntent(
                    "AttendanceLeaveTool",
                    "attendance_leave_summary",
                    employeeNames),
                WorkHoursEvidence = workEvidences.FirstOrDefault(),
                LeaveEvidence = leaveEvidences.FirstOrDefault(),
                WorkHoursEvidences = workEvidences,
                LeaveEvidences = leaveEvidences,
                Llm = llm,
                Trace = CreateComparisonTrace(
                    "AttendanceTool + LeaveTool",
                    employeeNames.Count,
                    "Đã thu thập dữ liệu chấm công và đơn nghỉ phép trong cùng kỳ.",
                    "Đã đối chiếu riêng giờ làm thực tế và ngày nghỉ theo trạng thái phê duyệt.",
                    llm,
                    llmUsed,
                    answerResult.Used)
            };
        }

        private async Task<AgenticAiQueryResponseDto> BuildSalaryComparisonResponseAsync(
            AgenticAiQueryRequestDto request,
            AgenticToolIntentDto intent,
            IReadOnlyList<TargetEmployeeDto> employees,
            AgenticLlmStatusDto llm,
            bool llmUsed)
        {
            var isPeriodQuery = string.Equals(intent.Metric, "salary_period", StringComparison.OrdinalIgnoreCase);
            var evidences = new List<AgenticSalaryEvidenceDto>();
            foreach (var employee in employees)
            {
                evidences.Add(await _salaryTool.GetSalaryHistoryAsync(
                    employee,
                    isPeriodQuery ? request.Month : null,
                    isPeriodQuery ? request.Year : null));
            }
            var employeeNames = employees.Select(employee => employee.FullName).ToList();
            var culture = CultureInfo.GetCultureInfo("vi-VN");
            var summaries = evidences.Select(evidence =>
            {
                if (!isPeriodQuery)
                {
                    return $"{evidence.EmployeeName}: đã thanh toán {evidence.PaidNetSalary.ToString("N0", culture)} đ " +
                        $"qua {evidence.PaidPeriods} kỳ, còn chờ {evidence.PendingNetSalary.ToString("N0", culture)} đ";
                }

                var period = evidence.Periods.FirstOrDefault();
                return period == null
                    ? $"{evidence.EmployeeName}: chưa có bảng lương"
                    : $"{evidence.EmployeeName}: {period.NetSalary.ToString("N0", culture)} đ ({period.Status})";
            });
            var fallbackAnswer = isPeriodQuery
                ? $"Lương kỳ {request.Month:00}/{request.Year}: {string.Join("; ", summaries)}. " +
                  $"Tổng thực nhận đã ghi nhận là {evidences.Sum(item => item.RecordedNetSalary).ToString("N0", culture)} đ."
                : $"{string.Join("; ", summaries)}. Tổng đã thanh toán cho {employeeNames.Count} nhân viên là " +
                  $"{evidences.Sum(item => item.PaidNetSalary).ToString("N0", culture)} đ.";
            var answerResult = await _llmService.ComposeGroundedAnswerAsync(
                request.Question,
                "SalaryTool",
                evidences,
                new AgenticGroundedAnswerDto
                {
                    Answer = fallbackAnswer,
                    EmployeeId = employees[0].Id,
                    EmployeeIds = employees.Select(employee => employee.Id).ToList(),
                    Tool = "SalaryTool",
                    PrimaryValue = isPeriodQuery
                        ? evidences.Sum(item => item.RecordedNetSalary)
                        : evidences.Sum(item => item.PaidNetSalary),
                    SecondaryValue = evidences.Sum(item => item.PendingNetSalary),
                    RecordCount = evidences.Sum(item => item.TotalPeriods)
                });
            llm.WasUsed = llm.WasUsed || answerResult.Used;
            llm.Notes.Add($"Response Agent: {answerResult.Message}");

            return new AgenticAiQueryResponseDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Question = request.Question.Trim(),
                Answer = answerResult.Value.Answer,
                Intent = CreateMultiEmployeeIntent("SalaryTool", intent.Metric, employeeNames),
                SalaryEvidence = evidences.FirstOrDefault(),
                SalaryEvidences = evidences,
                Llm = llm,
                Trace = CreateComparisonTrace(
                    "SalaryTool",
                    employeeNames.Count,
                    $"Đã đọc {evidences.Sum(item => item.TotalPeriods)} kỳ lương của {employeeNames.Count} nhân viên.",
                    "Đã tách kỳ đã thanh toán khỏi kỳ đang chờ trước khi cộng tổng.",
                    llm,
                    llmUsed,
                    answerResult.Used)
            };
        }

        private async Task<AgenticAiQueryResponseDto> BuildTaskComparisonResponseAsync(
            AgenticAiQueryRequestDto request,
            IReadOnlyList<TargetEmployeeDto> employees,
            AgenticLlmStatusDto llm,
            bool llmUsed)
        {
            var evidences = new List<AgenticTaskEvidenceDto>();
            foreach (var employee in employees)
            {
                evidences.Add(await _taskTool.GetTaskSummaryAsync(employee, request.Month, request.Year));
            }
            var employeeNames = employees.Select(employee => employee.FullName).ToList();
            var summaries = evidences.Select(evidence =>
                $"{evidence.EmployeeName}: {evidence.TotalTasks} task " +
                $"({evidence.ApprovedTasks} hoàn thành, {evidence.InProgressTasks} đang làm, " +
                $"{evidence.SubmittedTasks} chờ duyệt, {evidence.OverdueTasks} quá hạn)");
            var fallbackAnswer =
                $"Trong tháng {request.Month:00}/{request.Year}, {string.Join("; ", summaries)}. " +
                $"Tổng cộng {employeeNames.Count} nhân viên có {evidences.Sum(item => item.TotalTasks)} task.";
            var answerResult = await _llmService.ComposeGroundedAnswerAsync(
                request.Question,
                "TaskTool",
                evidences,
                new AgenticGroundedAnswerDto
                {
                    Answer = fallbackAnswer,
                    EmployeeId = employees[0].Id,
                    EmployeeIds = employees.Select(employee => employee.Id).ToList(),
                    Tool = "TaskTool",
                    PrimaryValue = evidences.Sum(item => item.TotalTasks),
                    SecondaryValue = evidences.Sum(item => item.ApprovedTasks),
                    RecordCount = evidences.Sum(item => item.Tasks.Count)
                });
            llm.WasUsed = llm.WasUsed || answerResult.Used;
            llm.Notes.Add($"Response Agent: {answerResult.Message}");

            return new AgenticAiQueryResponseDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Question = request.Question.Trim(),
                Answer = answerResult.Value.Answer,
                Intent = CreateMultiEmployeeIntent("TaskTool", "task_summary", employeeNames),
                TaskEvidence = evidences.FirstOrDefault(),
                TaskEvidences = evidences,
                Llm = llm,
                Trace = CreateComparisonTrace(
                    "TaskTool",
                    employeeNames.Count,
                    $"Đã đọc {evidences.Sum(item => item.TotalTasks)} task của {employeeNames.Count} nhân viên trong kỳ.",
                    "Đã kiểm tra trạng thái, tiến độ, deadline và review mới nhất của từng nhân viên.",
                    llm,
                    llmUsed,
                    answerResult.Used)
            };
        }

        private static AgenticToolIntentDto CreateMultiEmployeeIntent(
            string tool,
            string metric,
            List<string> employeeNames)
        {
            return new AgenticToolIntentDto
            {
                IsSupported = true,
                Tool = tool,
                Metric = metric,
                EmployeeName = employeeNames.FirstOrDefault() ?? "",
                EmployeeNames = employeeNames
            };
        }

        private static List<AgenticTraceDto> CreateComparisonTrace(
            string tool,
            int employeeCount,
            string toolResult,
            string validationResult,
            AgenticLlmStatusDto llm,
            bool llmUsed,
            bool answerUsed)
        {
            return new List<AgenticTraceDto>
            {
                new()
                {
                    Agent = "HR AI Orchestrator",
                    Action = "Hiểu câu hỏi nhiều nhân viên",
                    Result = llmUsed
                        ? $"{llm.Provider} đã chọn {tool} cho {employeeCount} nhân viên."
                        : $"Bộ định tuyến đã nhận diện {employeeCount} nhân viên và chọn {tool}.",
                    CreatedAt = DateTime.Now
                },
                new()
                {
                    Agent = tool,
                    Action = "Truy vấn dữ liệu theo từng nhân viên",
                    Result = toolResult,
                    CreatedAt = DateTime.Now
                },
                new()
                {
                    Agent = "Validation Agent",
                    Action = "Đối chiếu kết quả tổng hợp",
                    Result = validationResult,
                    CreatedAt = DateTime.Now
                },
                new()
                {
                    Agent = "Response Agent",
                    Action = "So sánh và diễn đạt kết quả",
                    Result = answerUsed
                        ? $"{llm.Provider} đã diễn đạt tự nhiên từ toàn bộ bằng chứng đã xác minh."
                        : "Đã dùng câu trả lời dự phòng từ số liệu đã xác minh.",
                    CreatedAt = DateTime.Now
                }
            };
        }

        private static void ValidateRequest(AgenticAiQueryRequestDto request)
        {
            if (request.ManagerId <= 0)
                throw new InvalidOperationException("Thiếu ManagerId.");
            if (string.IsNullOrWhiteSpace(request.Question))
                throw new InvalidOperationException("Câu hỏi không được để trống.");
            if (request.Month is < 1 or > 12 || request.Year is < 2020 or > 2100)
                throw new InvalidOperationException("Kỳ truy vấn không hợp lệ.");
        }

        private static void ValidateIntent(AgenticToolIntentDto intent)
        {
            if (!intent.IsSupported)
                throw new InvalidOperationException(
                    "Hiện tại hỗ trợ truy vấn chấm công, giờ làm, đi trễ, nghỉ phép, lịch sử lương và tổng quan task của nhân viên.");

            var isAttendanceIntent =
                string.Equals(intent.Tool, "AttendanceTool", StringComparison.OrdinalIgnoreCase)
                && (
                    string.Equals(intent.Metric, "late_days", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(intent.Metric, "attendance_summary", StringComparison.OrdinalIgnoreCase)
                );
            var isLeaveIntent =
                string.Equals(intent.Tool, "LeaveTool", StringComparison.OrdinalIgnoreCase)
                && string.Equals(intent.Metric, "leave_summary", StringComparison.OrdinalIgnoreCase);
            var isAttendanceLeaveIntent =
                string.Equals(intent.Tool, "AttendanceLeaveTool", StringComparison.OrdinalIgnoreCase)
                && string.Equals(intent.Metric, "attendance_leave_summary", StringComparison.OrdinalIgnoreCase);
            var isSalaryIntent =
                string.Equals(intent.Tool, "SalaryTool", StringComparison.OrdinalIgnoreCase)
                && (
                    string.Equals(intent.Metric, "total_salary_history", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(intent.Metric, "salary_period", StringComparison.OrdinalIgnoreCase)
                );
            var isTaskIntent =
                string.Equals(intent.Tool, "TaskTool", StringComparison.OrdinalIgnoreCase)
                && string.Equals(intent.Metric, "task_summary", StringComparison.OrdinalIgnoreCase);
            if (!isAttendanceIntent
                && !isLeaveIntent
                && !isAttendanceLeaveIntent
                && !isSalaryIntent
                && !isTaskIntent)
            {
                throw new InvalidOperationException("Mô hình AI yêu cầu Tool hoặc chỉ số chưa được hệ thống cho phép.");
            }
        }

        private static (string Tool, string Metric)? DetectIntent(string question)
        {
            var normalized = Normalize(question);
            var asksLate = normalized.Contains("di tre") || normalized.Contains("di muon");
            var asksLeave = normalized.Contains("nghi phep")
                || normalized.Contains("ngay nghi")
                || normalized.Contains("don nghi")
                || normalized.Contains("nghi bao nhieu");
            var asksAttendanceSummary = normalized.Contains("gio lam")
                || normalized.Contains("tong gio")
                || normalized.Contains("bao nhieu gio")
                || normalized.Contains("lam bao nhieu gio")
                || normalized.Contains("cham cong")
                || normalized.Contains("tang ca")
                || normalized.Contains("lam them gio")
                || normalized.Contains("ve som")
                || normalized.Contains("thieu cong")
                || normalized.Contains("check-in")
                || normalized.Contains("check in")
                || normalized.Contains("check-out")
                || normalized.Contains("check out");

            if (asksLeave && (asksAttendanceSummary || asksLate))
                return ("AttendanceLeaveTool", "attendance_leave_summary");

            if (asksLeave)
                return ("LeaveTool", "leave_summary");

            if (asksLate)
                return ("AttendanceTool", "late_days");

            if (asksAttendanceSummary)
                return ("AttendanceTool", "attendance_summary");

            if (normalized.Contains("task")
                || normalized.Contains("cong viec")
                || normalized.Contains("nhiem vu"))
            {
                return ("TaskTool", "task_summary");
            }

            if (normalized.Contains("luong"))
            {
                var asksPeriodSalary = normalized.Contains("thang nay")
                    || normalized.Contains("ky nay")
                    || normalized.Contains("thang hien tai")
                    || normalized.Contains("luong thang");
                return asksPeriodSalary
                    ? ("SalaryTool", "salary_period")
                    : ("SalaryTool", "total_salary_history");
            }

            return null;
        }

        private static List<TargetEmployeeDto> FindEmployeesInQuestion(
            IEnumerable<TargetEmployeeDto> employees,
            string question)
        {
            var employeeList = employees.ToList();
            var normalizedQuestion = $" {Normalize(question)} ";
            var fullNameMatches = employeeList
                .OrderByDescending(employee => employee.FullName.Length)
                .Where(employee => normalizedQuestion.Contains($" {Normalize(employee.FullName)} "))
                .ToList();

            var uniqueAliases = employeeList
                .SelectMany(employee => BuildNameAliases(employee.FullName)
                    .Select(alias => new { Alias = alias, Employee = employee }))
                .GroupBy(item => item.Alias)
                .Where(group => group.Select(item => item.Employee.Id).Distinct().Count() == 1)
                .Select(group => group.First())
                .Where(item => normalizedQuestion.Contains($" {item.Alias} "))
                .Select(item => item.Employee);

            return fullNameMatches
                .Concat(uniqueAliases)
                .GroupBy(employee => employee.Id)
                .Select(group => group.First())
                .Take(10)
                .ToList();
        }

        private static IEnumerable<string> BuildNameAliases(string fullName)
        {
            var parts = Normalize(fullName)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) yield break;

            yield return parts[^1];
            if (parts.Length >= 2)
                yield return $"{parts[^2]} {parts[^1]}";
        }

        private static List<TargetEmployeeDto> ResolveEmployees(
            IEnumerable<TargetEmployeeDto> employees,
            AgenticToolIntentDto intent,
            IReadOnlyCollection<TargetEmployeeDto> fallbackEmployees)
        {
            var employeeList = employees.ToList();
            var requestedNames = GetRequestedEmployeeNames(intent);

            var resolved = requestedNames
                .Select(name => ResolveEmployee(employeeList, name))
                .Where(employee => employee != null)
                .Cast<TargetEmployeeDto>()
                .Concat(fallbackEmployees)
                .GroupBy(employee => employee.Id)
                .Select(group => group.First())
                .Take(10)
                .ToList();

            return resolved;
        }

        private static List<string> GetRequestedEmployeeNames(AgenticToolIntentDto intent)
        {
            var requestedNames = (intent.EmployeeNames ?? new List<string>())
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Select(name => name.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (requestedNames.Count == 0 && !string.IsNullOrWhiteSpace(intent.EmployeeName))
            {
                requestedNames.Add(intent.EmployeeName.Trim());
            }

            return requestedNames;
        }

        private static bool HasMultipleEmployeeConnector(string question)
        {
            var normalized = $" {Normalize(question)} ";
            return normalized.Contains(" va ")
                || normalized.Contains(" cung ")
                || question.Contains(',');
        }

        private static TargetEmployeeDto? ResolveEmployee(
            IEnumerable<TargetEmployeeDto> employees,
            string employeeName)
        {
            if (string.IsNullOrWhiteSpace(employeeName)) return null;
            var normalizedName = Normalize(employeeName);
            var matches = employees
                .Where(employee =>
                    Normalize(employee.FullName) == normalizedName
                    || Normalize(employee.FullName).Contains(normalizedName)
                    || normalizedName.Contains(Normalize(employee.FullName)))
                .Take(2)
                .ToList();

            return matches.Count == 1 ? matches[0] : null;
        }

        private static string Normalize(string value)
        {
            var decomposed = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();
            foreach (var character in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                    builder.Append(character == 'đ' ? 'd' : character);
            }

            return string.Join(' ', builder.ToString()
                .Normalize(NormalizationForm.FormC)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }
    }
}
