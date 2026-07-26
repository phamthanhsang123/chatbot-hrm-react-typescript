using Admin.DTOs;

namespace Admin.Services.Agentic
{
    public class PlannerAgent
    {
        public AgenticPlanDto CreatePlan(AgenticAiRunRequestDto request)
        {
            var goal = string.IsNullOrWhiteSpace(request.Goal)
                ? "Evaluate employee competency and recommend manager actions."
                : request.Goal.Trim();

            return new AgenticPlanDto
            {
                Intent = goal,
                RequiredData =
                {
                    "Employee profile",
                    "Department and position",
                    "Task progress",
                    "Task review score",
                    "Attendance",
                    "Approved leave",
                    "HR policy rules"
                },
                RequiredTools =
                {
                    "EmployeeTool",
                    "TaskTool",
                    "AttendanceTool",
                    "LeaveTool",
                    "PolicyTool"
                },
                SuccessCriteria =
                {
                    "Data is collected through Tool Layer only.",
                    "Each employee has an explainable analysis.",
                    "Recommendation references policy rules.",
                    "Reflection validates data quality and recommendation quality."
                },
                Steps =
                {
                    new AgenticPlanStepDto { Order = 1, Agent = "DataAgent", Action = "Collect scoped HRM data", Reason = "Agent needs factual HR data before analysis." },
                    new AgenticPlanStepDto { Order = 2, Agent = "AnalysisAgent", Action = "Analyze attendance, task performance, quality and discipline", Reason = "Convert raw HRM data into measurable competency signals." },
                    new AgenticPlanStepDto { Order = 3, Agent = "PolicyAgent", Action = "Load reward, promotion and improvement rules", Reason = "Recommendations must follow HR policy." },
                    new AgenticPlanStepDto { Order = 4, Agent = "RecommendationAgent", Action = "Generate explainable manager actions", Reason = "Manager needs decision support, not only score numbers." },
                    new AgenticPlanStepDto { Order = 5, Agent = "ReflectionAgent", Action = "Validate data, policy and recommendation", Reason = "Agentic AI must self-check before output." },
                    new AgenticPlanStepDto { Order = 6, Agent = "ReportAgent", Action = "Create final dashboard/report payload", Reason = "Manager needs a readable final result." }
                }
            };
        }
    }

    public class DataAgent
    {
        private readonly AgenticHrmTool _tool;

        public DataAgent(AgenticHrmTool tool)
        {
            _tool = tool;
        }

        public async Task<AgenticDataPackageDto> CollectAsync(AgenticAiRunRequestDto request)
        {
            var employees = await _tool.GetTargetEmployeesAsync(request);
            var (inputs, missing) = await _tool.GetCompetencyInputsAsync(request, employees);

            var scope = request.EmployeeId.HasValue
                ? "single employee"
                : request.DepartmentId.HasValue
                    ? "department"
                    : "manager accessible employees";

            var data = new AgenticDataPackageDto
            {
                Scope = scope,
                Employees = employees,
                CompetencyInputs = inputs,
                MissingData = missing
            };

            if (employees.Count == 0)
            {
                data.MissingData.Add("No employee found for selected scope.");
            }

            data.ContextNotes.Add("DataAgent only calls Tool Layer. It does not analyze business performance.");
            return data;
        }
    }

    public class AnalysisAgent
    {
        public AgenticAnalysisDto Analyze(AgenticDataPackageDto data)
        {
            var employees = data.CompetencyInputs
                .Where(input => input.TotalTasks > 0 || input.AttendanceDays > 0)
                .Select(AnalyzeEmployee)
                .ToList();
            var decisionReadyEmployees = employees
                .Where(employee => employee.IsDecisionReady)
                .ToList();
            var averageScore = decisionReadyEmployees.Count == 0
                ? 0
                : Math.Round(decisionReadyEmployees.Average(e => e.TotalScore), 2);

            var analysis = new AgenticAnalysisDto
            {
                TotalEmployees = employees.Count,
                DecisionReadyEmployees = decisionReadyEmployees.Count,
                AverageScore = averageScore,
                Employees = employees
            };

            if (employees.Count > 0)
            {
                analysis.DepartmentInsights.Add($"Điểm năng lực trung bình: {averageScore}.");
                analysis.DepartmentInsights.Add($"Nhân viên rủi ro cao: {employees.Count(e => e.RiskLevel == "HIGH")}.");
                analysis.DepartmentInsights.Add($"Đủ dữ liệu ra quyết định: {decisionReadyEmployees.Count}/{employees.Count}.");
                analysis.DepartmentInsights.Add($"Ứng viên được đề xuất ghi nhận: {decisionReadyEmployees.Count(e => e.TotalScore >= 90)}.");
            }

            return analysis;
        }

        private static AgenticEmployeeAnalysisDto AnalyzeEmployee(CompetencyInputDataDto input)
        {
            var hasAttendanceEvidence = input.AttendanceDays > 0 || input.ApprovedLeaveDays > 0;
            var hasTaskEvidence = input.TotalTasks > 0;
            var hasReviewEvidence = input.AverageQualityScore > 0 || input.AverageDeadlineScore > 0;
            var hasProgressEvidence = input.ProgressUpdateCount > 0
                || input.ApprovedTasks > 0
                || input.RejectedTasks > 0
                || input.RevisionTasks > 0;

            var completeness = (hasTaskEvidence ? 35m : 0)
                + (hasReviewEvidence ? 25m : 0)
                + (hasAttendanceEvidence ? 25m : 0)
                + (hasProgressEvidence ? 15m : 0);
            var isDecisionReady = hasTaskEvidence
                && hasReviewEvidence
                && hasAttendanceEvidence
                && completeness >= 85;

            var attendance = hasAttendanceEvidence ? CalculateAttendanceScore(input) : 0;
            var taskPerformance = hasTaskEvidence ? CalculateTaskPerformanceScore(input) : 0;
            var qualitySkill = hasReviewEvidence ? CalculateQualitySkillScore(input) : 0;
            var discipline = hasTaskEvidence || hasAttendanceEvidence
                ? CalculateDisciplineResponsibilityScore(input)
                : 0;

            var total = isDecisionReady
                ? Math.Round(
                    attendance * 0.20m
                    + taskPerformance * 0.40m
                    + qualitySkill * 0.25m
                    + discipline * 0.15m,
                    2
                )
                : 0;

            var result = new AgenticEmployeeAnalysisDto
            {
                EmployeeId = input.EmployeeId,
                EmployeeName = input.EmployeeName,
                AttendanceScore = attendance,
                TaskPerformanceScore = taskPerformance,
                QualitySkillScore = qualitySkill,
                DisciplineResponsibilityScore = discipline,
                TotalScore = total,
                Rating = isDecisionReady ? GetRating(total) : "Chưa đủ dữ liệu",
                RiskLevel = isDecisionReady ? GetRiskLevel(total, input) : "UNKNOWN",
                DataCompletenessPercent = completeness,
                ConfidenceLevel = isDecisionReady
                    ? "HIGH"
                    : completeness >= 60
                        ? "MEDIUM"
                        : "LOW",
                IsDecisionReady = isDecisionReady
            };

            AddEvidence(result, hasTaskEvidence, "Task và tiến độ", "Task trong kỳ");
            AddEvidence(result, hasReviewEvidence, "Review chất lượng và deadline", "Review của Manager");
            AddEvidence(result, hasAttendanceEvidence, "Chấm công và nghỉ phép", "Dữ liệu chấm công");
            AddEvidence(result, hasProgressEvidence, "Lịch sử cập nhật tiến độ", "Lịch sử cập nhật tiến độ");

            result.Findings.Add($"Độ đầy đủ dữ liệu: {completeness}% ({result.ConfidenceLevel}).");
            if (hasTaskEvidence)
            {
                result.Findings.Add($"Task hoàn thành và được duyệt: {input.ApprovedTasks}/{input.TotalTasks}.");
                result.Findings.Add($"Tiến độ trung bình: {input.AverageProgress}%.");
            }
            if (hasReviewEvidence)
                result.Findings.Add($"Điểm chất lượng: {input.AverageQualityScore}, điểm deadline: {input.AverageDeadlineScore}.");
            if (hasAttendanceEvidence)
                result.Findings.Add($"Đi muộn: {input.LateDays} ngày, về sớm: {input.EarlyLeaveDays} ngày, nghỉ phép được duyệt: {input.ApprovedLeaveDays} ngày.");

            if (input.TotalTasks == 0)
                result.RootCauses.Add("Không có task trong kỳ; hệ thống không tự gán điểm hiệu suất mặc định.");
            if (!hasReviewEvidence)
                result.RootCauses.Add("Chưa có review chất lượng/deadline từ Manager.");
            if (!hasAttendanceEvidence)
                result.RootCauses.Add("Không có dữ liệu chấm công hoặc nghỉ phép được duyệt trong kỳ.");
            if (!isDecisionReady)
                result.RootCauses.Add("Kết quả chỉ mang tính sơ bộ và không được dùng để thưởng, phạt hoặc điều chỉnh lương.");
            if (input.OverdueTasks > 0)
                result.RootCauses.Add("Task quá hạn làm giảm mức độ tin cậy và kỷ luật bàn giao.");
            if (input.RevisionTasks > 0 || input.RejectedTasks > 0)
                result.RootCauses.Add("Task cần sửa hoặc bị từ chối cho thấy vấn đề về chất lượng hoặc hiểu yêu cầu.");
            if (input.LateDays > 0 || input.IncompleteAttendanceDays > 0)
                result.RootCauses.Add("Vấn đề chấm công làm giảm điểm kỷ luật.");

            return result;
        }

        private static void AddEvidence(
            AgenticEmployeeAnalysisDto result,
            bool isAvailable,
            string availableLabel,
            string missingLabel)
        {
            if (isAvailable)
                result.AvailableEvidence.Add(availableLabel);
            else
                result.MissingEvidence.Add(missingLabel);
        }

        private static decimal CalculateAttendanceScore(CompetencyInputDataDto input)
        {
            if (input.AttendanceDays == 0)
                return input.ApprovedLeaveDays > 0 ? 85 : 0;

            var penalty = input.LateDays * 4
                + input.EarlyLeaveDays * 3
                + input.IncompleteAttendanceDays * 5;

            var leaveAdjustment = Math.Min(input.ApprovedLeaveDays * 1.5m, 8);
            return ClampScore(100 - penalty + leaveAdjustment);
        }

        private static decimal CalculateTaskPerformanceScore(CompetencyInputDataDto input)
        {
            if (input.TotalTasks == 0) return 0;

            var approvedRatio = (decimal)input.ApprovedTasks / input.TotalTasks;
            var submittedOrApproved = input.Tasks.Count(t => t.Status is "SUBMITTED" or "APPROVED");
            var submittedRatio = (decimal)submittedOrApproved / input.TotalTasks;

            var score = input.AverageProgress * 0.35m
                + approvedRatio * 45
                + submittedRatio * 20
                - input.OverdueTasks * 7
                - input.RejectedTasks * 8;

            return ClampScore(score);
        }

        private static decimal CalculateQualitySkillScore(CompetencyInputDataDto input)
        {
            if (input.AverageQualityScore <= 0 && input.AverageDeadlineScore <= 0) return 0;

            var score = input.AverageQualityScore * 0.75m
                + input.AverageDeadlineScore * 0.25m
                - input.RevisionTasks * 4
                - input.RejectedTasks * 8;

            return ClampScore(score);
        }

        private static decimal CalculateDisciplineResponsibilityScore(CompetencyInputDataDto input)
        {
            var noProgressTasks = input.Tasks.Count(t => t.ProgressPercent == 0 && t.Status != "NEW");
            var updateBonus = input.TotalTasks == 0
                ? 0
                : Math.Min((decimal)input.ProgressUpdateCount / input.TotalTasks * 8, 8);

            var penalty = input.OverdueTasks * 8
                + noProgressTasks * 5
                + input.IncompleteAttendanceDays * 4
                + input.LateDays * 2;

            return ClampScore(92 + updateBonus - penalty);
        }

        private static string GetRating(decimal totalScore)
        {
            if (totalScore >= 90) return "Xuất sắc";
            if (totalScore >= 80) return "Tốt";
            if (totalScore >= 65) return "Trung bình";
            return "Cần cải thiện";
        }

        private static string GetRiskLevel(decimal totalScore, CompetencyInputDataDto input)
        {
            if (totalScore < 65 || input.RejectedTasks >= 2 || input.OverdueTasks >= 3) return "HIGH";
            if (totalScore < 80 || input.OverdueTasks > 0 || input.LateDays >= 3) return "MEDIUM";
            return "LOW";
        }

        private static decimal ClampScore(decimal value)
        {
            return Math.Round(Math.Max(0, Math.Min(100, value)), 2);
        }
    }

    public class PolicyAgent
    {
        private readonly PolicyTool _policyTool;

        public PolicyAgent(PolicyTool policyTool)
        {
            _policyTool = policyTool;
        }

        public Task<AgenticPolicyContextDto> LoadPolicyAsync(AgenticAiRunRequestDto request)
        {
            return _policyTool.LoadAsync(request);
        }
    }

    public class RecommendationAgent
    {
        public AgenticRecommendationPackageDto Recommend(AgenticAnalysisDto analysis, AgenticPolicyContextDto policy)
        {
            var result = new AgenticRecommendationPackageDto();

            foreach (var employee in analysis.Employees.OrderByDescending(e => e.TotalScore))
            {
                result.Items.Add(BuildRecommendation(employee, policy));
            }

            var rewardCount = result.Items.Count(x =>
                string.Equals(x.PolicyReference, "REWARD_90", StringComparison.OrdinalIgnoreCase));
            var improveCount = result.Items.Count(x =>
                string.Equals(x.PolicyReference, "IMPROVE_65", StringComparison.OrdinalIgnoreCase));

            result.OverallRecommendation = $"Ứng viên được đề xuất ghi nhận: {rewardCount}. Nhân viên cần kế hoạch cải thiện: {improveCount}.";
            return result;
        }

        private static AgenticRecommendationDto BuildRecommendation(
            AgenticEmployeeAnalysisDto employee,
            AgenticPolicyContextDto policy)
        {
            var dataRequired = FindRule(policy, "DATA_REQUIRED");
            var reward = FindRule(policy, "REWARD_90");
            var growth = FindRule(policy, "GROWTH_85");
            var maintain = FindRule(policy, "MAINTAIN_65");
            var improve = FindRule(policy, "IMPROVE_65");

            if (!employee.IsDecisionReady)
            {
                var recommendation = Create(
                    employee,
                    "Bổ sung bằng chứng trước khi ra quyết định",
                    "HIGH",
                    dataRequired?.Description
                        ?? "Chưa đủ dữ liệu để đưa ra quyết định nhân sự đáng tin cậy.",
                    dataRequired?.Code ?? ""
                );
                recommendation.Evidence =
                    $"Data completeness={employee.DataCompletenessPercent}%, confidence={employee.ConfidenceLevel}, missing={string.Join(", ", employee.MissingEvidence)}.";
                return recommendation;
            }

            if (reward != null && employee.TotalScore >= reward.Threshold && employee.RiskLevel != "HIGH")
            {
                return Create(employee, "Ghi nhận hoặc khen thưởng", "HIGH", reward.Description, reward.Code);
            }

            if (growth != null && employee.TotalScore >= growth.Threshold)
            {
                return Create(employee, "Giao nhiệm vụ thử thách hơn hoặc rà soát lương", "MEDIUM", growth.Description, growth.Code);
            }

            if (improve != null && (employee.TotalScore < improve.Threshold || employee.RiskLevel == "HIGH"))
            {
                return Create(employee, "Lập kế hoạch cải thiện và theo dõi hằng tuần", "HIGH", improve.Description, improve.Code);
            }

            if (improve != null && employee.DisciplineResponsibilityScore < 75)
            {
                return Create(employee, "Trao đổi về kỷ luật và deadline", "MEDIUM", "Điểm kỷ luật hoặc trách nhiệm thấp hơn mức kỳ vọng.", improve.Code);
            }

            if (maintain != null)
            {
                return Create(employee, "Duy trì khối lượng công việc", "LOW", maintain.Description, maintain.Code);
            }

            return Create(employee, "Chờ Manager xem xét", "HIGH", "Không có chính sách phù hợp để tự động đề xuất.", "");
        }

        private static AgenticPolicyRuleDto? FindRule(AgenticPolicyContextDto policy, string code)
        {
            return policy.Rules.FirstOrDefault(rule =>
                string.Equals(rule.Code, code, StringComparison.OrdinalIgnoreCase));
        }

        private static AgenticRecommendationDto Create(
            AgenticEmployeeAnalysisDto employee,
            string action,
            string priority,
            string reason,
            string policy)
        {
            return new AgenticRecommendationDto
            {
                EmployeeId = employee.EmployeeId,
                EmployeeName = employee.EmployeeName,
                Action = action,
                Priority = priority,
                Reason = reason,
                Evidence = $"Total={employee.TotalScore}, attendance={employee.AttendanceScore}, task={employee.TaskPerformanceScore}, quality={employee.QualitySkillScore}, discipline={employee.DisciplineResponsibilityScore}.",
                PolicyReference = policy
            };
        }
    }

    public class ReflectionAgent
    {
        public AgenticReflectionDto Validate(
            AgenticDataPackageDto data,
            AgenticAnalysisDto analysis,
            AgenticPolicyContextDto policy,
            AgenticRecommendationPackageDto recommendation)
        {
            var reflection = new AgenticReflectionDto();

            reflection.Checks.Add("Checked target employee scope.");
            reflection.Checks.Add("Checked data completeness signals.");
            reflection.Checks.Add("Checked score range 0-100.");
            reflection.Checks.Add("Checked recommendations have policy references.");

            if (data.Employees.Count == 0)
            {
                reflection.Issues.Add("No employee found for analysis.");
                reflection.NeedsMoreData = true;
            }

            if (data.CompetencyInputs.Count == 0)
            {
                reflection.Issues.Add("No competency input data collected.");
                reflection.NeedsMoreData = true;
            }

            if (analysis.TotalEmployees == 0)
            {
                reflection.Issues.Add("Không có nhân viên nào đủ bằng chứng task hoặc chấm công để phân tích.");
                reflection.NeedsRecommendationRevision = true;
            }

            if (data.MissingData.Count > 0)
            {
                reflection.Issues.AddRange(data.MissingData.Take(5));
                reflection.NeedsMoreData = true;
            }

            var employeesNotReady = analysis.Employees
                .Where(employee => !employee.IsDecisionReady)
                .ToList();
            foreach (var employee in employeesNotReady.Take(5))
            {
                reflection.Issues.Add(
                    $"{employee.EmployeeName}: dữ liệu mới đạt {employee.DataCompletenessPercent}%, còn thiếu {string.Join(", ", employee.MissingEvidence)}."
                );
            }
            if (employeesNotReady.Count > 0)
                reflection.NeedsMoreData = true;

            var inputsWithoutEvidence = data.CompetencyInputs
                .Where(input => input.TotalTasks == 0 && input.AttendanceDays == 0)
                .ToList();
            if (data.CompetencyInputs.Count > 0
                && inputsWithoutEvidence.Count == data.CompetencyInputs.Count)
            {
                reflection.Issues.Add("Không có task và chấm công cho toàn bộ phạm vi đã chọn; không đủ bằng chứng để lưu đánh giá.");
                reflection.NeedsRecommendationRevision = true;
            }

            if (analysis.Employees.Any(e => e.TotalScore < 0 || e.TotalScore > 100))
            {
                reflection.Issues.Add("At least one score is outside 0-100.");
                reflection.NeedsRecommendationRevision = true;
            }

            if (policy.Rules.Count == 0)
            {
                reflection.Issues.Add("No policy rules loaded.");
                reflection.NeedsPolicyReview = true;
            }

            if (recommendation.Items.Any(x => string.IsNullOrWhiteSpace(x.PolicyReference)))
            {
                reflection.Issues.Add("At least one recommendation does not reference policy.");
                reflection.NeedsRecommendationRevision = true;
            }

            var policyCodes = policy.Rules
                .Select(rule => rule.Code)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (recommendation.Items.Any(item => !policyCodes.Contains(item.PolicyReference)))
            {
                reflection.Issues.Add("At least one recommendation references an unknown policy code.");
                reflection.NeedsRecommendationRevision = true;
            }

            var notReadyIds = employeesNotReady
                .Select(employee => employee.EmployeeId)
                .ToHashSet();
            if (recommendation.Items.Any(item =>
                    notReadyIds.Contains(item.EmployeeId)
                    && !string.Equals(item.PolicyReference, "DATA_REQUIRED", StringComparison.OrdinalIgnoreCase)))
            {
                reflection.Issues.Add("Khuyến nghị cho nhân viên chưa đủ dữ liệu phải dùng policy DATA_REQUIRED.");
                reflection.NeedsRecommendationRevision = true;
            }

            if (reflection.NeedsMoreData)
                reflection.NextActions.Add("DataAgent should collect missing task/attendance/review data or manager should adjust the selected period.");

            if (reflection.NeedsPolicyReview)
                reflection.NextActions.Add("PolicyAgent should load company policy from RAG documents.");

            if (reflection.NeedsRecommendationRevision)
                reflection.NextActions.Add("RecommendationAgent should regenerate actions with valid score and policy references.");

            reflection.IsValid = !reflection.NeedsPolicyReview
                && !reflection.NeedsRecommendationRevision
                && data.Employees.Count > 0
                && analysis.DecisionReadyEmployees > 0;
            reflection.ValidationStatus = reflection.IsValid && reflection.NeedsMoreData
                ? "VALID_WITH_WARNINGS"
                : reflection.IsValid
                    ? "VALID"
                    : "INVALID";

            if (reflection.IsValid && reflection.Issues.Count == 0)
                reflection.NextActions.Add("Workflow is valid and ready for manager report.");

            return reflection;
        }
    }

    public class ReportAgent
    {
        public AgenticReportDto BuildReport(
            AgenticAiRunRequestDto request,
            AgenticAnalysisDto analysis,
            AgenticRecommendationPackageDto recommendation,
            AgenticReflectionDto reflection)
        {
            var title = $"Agentic AI competency report {request.Month}/{request.Year}";
            var decisionReady = analysis.Employees
                .Where(employee => employee.IsDecisionReady)
                .ToList();
            var highRisk = decisionReady.Count(e => e.RiskLevel == "HIGH");
            var excellent = decisionReady.Count(e => e.TotalScore >= 90);

            var report = new AgenticReportDto
            {
                Title = title,
                Summary = $"Analyzed {analysis.TotalEmployees} employee(s). Decision-ready {analysis.DecisionReadyEmployees}. Average score {analysis.AverageScore}. High risk {highRisk}. Reward candidates {excellent}.",
                GeneratedAt = DateTime.Now,
                ExportStatus = "Dashboard JSON generated successfully."
            };

            report.DashboardMetrics["totalEmployees"] = analysis.TotalEmployees;
            report.DashboardMetrics["decisionReadyEmployees"] = analysis.DecisionReadyEmployees;
            report.DashboardMetrics["averageScore"] = analysis.AverageScore;
            report.DashboardMetrics["highRiskEmployees"] = highRisk;
            report.DashboardMetrics["rewardCandidates"] = excellent;

            report.Highlights.AddRange(
                recommendation.Items
                    .Where(x => x.Priority == "HIGH")
                    .Take(5)
                    .Select(x => $"{x.EmployeeName}: {x.Action}")
            );

            report.Warnings.AddRange(reflection.Issues.Take(5));
            return report;
        }
    }
}
