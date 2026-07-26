using Admin.Data;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class Cdio4ComparisonDataSeeder
    {
        private const string Marker = "[CDIO4]";
        private readonly AppDbContext _db;

        public Cdio4ComparisonDataSeeder(AppDbContext db)
        {
            _db = db;
        }

        public async Task<Cdio4SeedSummary> SeedAsync()
        {
            var currentStart = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            var previousStart = currentStart.AddMonths(-1);
            var currentEnd = DateTime.Today < currentStart.AddMonths(1)
                ? DateTime.Today
                : currentStart.AddMonths(1).AddDays(-1);
            var previousEnd = currentStart.AddDays(-1);

            var employees = await _db.Employees
                .AsNoTracking()
                .Where(employee =>
                    employee.Role != "ADMIN"
                    && employee.Status != "inactive"
                    && employee.Status != "Đã nghỉ việc"
                    && employee.Status != "da nghi viec")
                .OrderBy(employee => employee.Id)
                .ToListAsync();

            var admin = await _db.Employees
                .AsNoTracking()
                .Where(employee => employee.Role == "ADMIN")
                .OrderBy(employee => employee.Id)
                .FirstOrDefaultAsync();

            if (employees.Count == 0 || admin == null)
            {
                throw new InvalidOperationException(
                    "Cần ít nhất một nhân viên đang làm việc và một tài khoản ADMIN để tạo dữ liệu so sánh.");
            }

            foreach (var employee in employees)
            {
                var profile = BuildProfile(employee.Id);
                var managerId = await ResolveManagerIdAsync(employee, admin.Id);

                await SeedPeriodAsync(
                    employee,
                    managerId,
                    previousStart,
                    previousEnd,
                    profile,
                    isCurrentPeriod: false);

                await SeedPeriodAsync(
                    employee,
                    managerId,
                    currentStart,
                    currentEnd,
                    profile,
                    isCurrentPeriod: true);
            }

            await _db.SaveChangesAsync();

            var employeeIds = employees.Select(employee => employee.Id).ToList();
            var periodStarts = new[] { previousStart, currentStart };
            var periodKeys = periodStarts
                .Select(period => (period.Year, period.Month))
                .ToHashSet();

            return new Cdio4SeedSummary
            {
                EmployeeCount = employees.Count,
                Employees = employees.Select(employee => employee.FullName).ToList(),
                PreviousPeriod = $"{previousStart.Month:00}/{previousStart.Year}",
                CurrentPeriod = $"{currentStart.Month:00}/{currentStart.Year}",
                AttendanceRows = await _db.Attendances.CountAsync(row =>
                    employeeIds.Contains(row.EmployeeId)
                    && row.WorkReportTitle != null
                    && row.WorkReportTitle.StartsWith(Marker)),
                ShiftRows = await _db.AttendanceShifts.CountAsync(row =>
                    employeeIds.Contains(row.EmployeeId)
                    && row.Title.StartsWith(Marker)),
                AttendanceRequestRows = await _db.AttendanceRequests.CountAsync(row =>
                    employeeIds.Contains(row.EmployeeId)
                    && row.Reason.StartsWith(Marker)),
                LeaveRows = await _db.LeaveRequests.CountAsync(row =>
                    employeeIds.Contains(row.EmployeeId)
                    && row.Reason.StartsWith(Marker)),
                PayrollRows = (await _db.Payrolls
                    .Where(row => employeeIds.Contains(row.EmployeeId))
                    .Select(row => new { row.Year, row.Month })
                    .ToListAsync())
                    .Count(row => periodKeys.Contains((row.Year, row.Month))),
                TaskRows = await _db.Tasks.CountAsync(row =>
                    employeeIds.Contains(row.EmployeeId)
                    && row.Title.StartsWith(Marker)),
                ProgressRows = await _db.TaskProgressLogs.CountAsync(row =>
                    row.Note != null && row.Note.StartsWith(Marker)),
                ReviewRows = await _db.TaskReviews.CountAsync(row =>
                    row.Comment != null && row.Comment.StartsWith(Marker))
            };
        }

        private async Task SeedPeriodAsync(
            Employee employee,
            int managerId,
            DateTime periodStart,
            DateTime periodEnd,
            ScenarioProfile profile,
            bool isCurrentPeriod)
        {
            var leaveDate = await SeedLeaveAsync(employee, periodStart, profile, isCurrentPeriod);
            await SeedAttendanceAsync(employee, periodStart, periodEnd, leaveDate, profile, isCurrentPeriod);
            await SeedAttendanceRequestAsync(employee, managerId, periodStart, profile, isCurrentPeriod);
            await SeedPayrollAsync(employee, periodStart, profile, isCurrentPeriod);
            await SeedTasksAsync(employee, managerId, periodStart, profile, isCurrentPeriod);
            await _db.SaveChangesAsync();
        }

        private async Task<DateTime?> SeedLeaveAsync(
            Employee employee,
            DateTime periodStart,
            ScenarioProfile profile,
            bool isCurrentPeriod)
        {
            var status = isCurrentPeriod ? profile.CurrentLeaveStatus : "Đã duyệt";
            var leaveDate = NextWeekday(periodStart.AddDays(7 + employee.Id % 8));
            var reason = $"{Marker} {periodStart:MM/yyyy} - Nghỉ {LeaveReason(employee.Id)}";

            var leave = await _db.LeaveRequests.FirstOrDefaultAsync(row =>
                row.EmployeeId == employee.Id && row.Reason == reason);
            if (leave == null)
            {
                leave = new LeaveRequest();
                _db.LeaveRequests.Add(leave);
            }

            leave.EmployeeId = employee.Id;
            leave.LeaveTypeId = employee.Id % 3 == 0 ? 2 : 1;
            leave.StartDate = leaveDate;
            leave.EndDate = leaveDate;
            leave.TotalDays = 1;
            leave.Reason = reason;
            leave.Status = status;
            leave.CreatedAt = leaveDate.AddDays(-5).AddHours(9);

            return status == "Đã duyệt" ? leaveDate : null;
        }

        private async Task SeedAttendanceAsync(
            Employee employee,
            DateTime periodStart,
            DateTime periodEnd,
            DateTime? approvedLeaveDate,
            ScenarioProfile profile,
            bool isCurrentPeriod)
        {
            var businessDays = BusinessDays(periodStart, periodEnd)
                .Where(date => !approvedLeaveDate.HasValue || date.Date != approvedLeaveDate.Value.Date)
                .ToList();
            var lateCount = isCurrentPeriod ? profile.CurrentLateDays : profile.PreviousLateDays;
            var earlyCount = isCurrentPeriod ? profile.CurrentEarlyDays : profile.PreviousEarlyDays;
            var lateIndices = SpreadIndices(businessDays.Count, lateCount);
            var earlyIndices = SpreadIndices(businessDays.Count, earlyCount, offset: 2);
            var incompleteIndex = isCurrentPeriod && profile.HasCurrentIncompleteDay
                ? Math.Max(0, businessDays.Count - 3)
                : -1;

            var existingAttendanceRows = await _db.Attendances
                .Where(row =>
                    row.EmployeeId == employee.Id
                    && row.Date >= periodStart
                    && row.Date <= periodEnd)
                .OrderBy(row => row.Id)
                .ToListAsync();
            var existingAttendance = existingAttendanceRows
                .GroupBy(row => row.Date.Date)
                .ToDictionary(group => group.Key, group => group.First());

            var existingShiftRows = await _db.AttendanceShifts
                .Where(row =>
                    row.EmployeeId == employee.Id
                    && row.WorkDate >= periodStart
                    && row.WorkDate <= periodEnd)
                .OrderBy(row => row.Id)
                .ToListAsync();
            var existingShifts = existingShiftRows
                .GroupBy(row => row.WorkDate.Date)
                .ToDictionary(group => group.Key, group => group.First());

            for (var index = 0; index < businessDays.Count; index++)
            {
                var date = businessDays[index];
                var isLate = lateIndices.Contains(index);
                var isEarly = earlyIndices.Contains(index);
                var isIncomplete = index == incompleteIndex;
                var checkIn = isLate
                    ? new TimeSpan(9, 0 + index % 12, 0)
                    : new TimeSpan(8, 3 + index % 15, 0);
                TimeSpan? checkOut = isIncomplete
                    ? null
                    : isEarly
                        ? new TimeSpan(16, 15 + index % 20, 0)
                        : index % 5 == 0
                            ? new TimeSpan(18, 10, 0)
                            : new TimeSpan(17, 35 + index % 15, 0);

                if (!existingAttendance.TryGetValue(date.Date, out var attendance))
                {
                    attendance = new Attendance
                    {
                        EmployeeId = employee.Id,
                        Date = date,
                        CreatedAt = date.AddHours(8),
                        UpdatedAt = date.AddHours(18)
                    };
                    _db.Attendances.Add(attendance);
                }
                else if (attendance.WorkReportTitle?.StartsWith(Marker) != true)
                {
                    continue;
                }

                attendance.CheckInTime = checkIn;
                attendance.CheckOutTime = checkOut;
                attendance.TotalHours = CalculateWorkingHours(checkIn, checkOut);
                attendance.IsLate = checkIn > new TimeSpan(8, 30, 0);
                attendance.IsEarlyLeave = checkOut.HasValue
                    && checkOut.Value < new TimeSpan(17, 30, 0);
                attendance.Status = isIncomplete ? "Thiếu công" : "Đã chấm công";
                attendance.Note = isIncomplete ? "Thiếu giờ check-out" : "";
                attendance.WorkReportTitle = $"{Marker} {WorkTitle(employee.DepartmentId, index)}";
                attendance.WorkReportDescription =
                    $"Hoàn thành công việc ngày {date:dd/MM/yyyy}; cập nhật tiến độ và phối hợp với nhóm.";
                attendance.WorkReportNote = isIncomplete
                    ? "Thiếu check-out, đã tạo yêu cầu bổ sung."
                    : isLate
                        ? "Check-in muộn hơn lịch ca."
                        : null;

                if (!existingShifts.TryGetValue(date.Date, out var shift))
                {
                    shift = new AttendanceShift
                    {
                        EmployeeId = employee.Id,
                        WorkDate = date,
                        CreatedAt = date.AddDays(-2).AddHours(9)
                    };
                    _db.AttendanceShifts.Add(shift);
                }
                else if (!shift.Title.StartsWith(Marker))
                {
                    continue;
                }

                shift.StartTime = new TimeSpan(8, 0, 0);
                shift.EndTime = new TimeSpan(17, 30, 0);
                shift.Title = $"{Marker} Ca hành chính";
                shift.Description = "Ca làm việc chuẩn, nghỉ trưa từ 12:00 đến 13:00.";
                shift.Status = isIncomplete ? "WORKING" : "COMPLETED";
                shift.UpdatedAt = date.AddHours(18);
            }
        }

        private async Task SeedAttendanceRequestAsync(
            Employee employee,
            int managerId,
            DateTime periodStart,
            ScenarioProfile profile,
            bool isCurrentPeriod)
        {
            var workDate = NextWeekday(periodStart.AddDays(4 + employee.Id % 12));
            var reason = $"{Marker} {periodStart:MM/yyyy} - {AttendanceRequestReason(employee.Id)}";
            var request = await _db.AttendanceRequests.FirstOrDefaultAsync(row =>
                row.EmployeeId == employee.Id && row.Reason == reason);
            if (request == null)
            {
                request = new AttendanceRequest();
                _db.AttendanceRequests.Add(request);
            }

            var status = isCurrentPeriod ? profile.CurrentAttendanceRequestStatus : "APPROVED";
            request.EmployeeId = employee.Id;
            request.WorkDate = workDate;
            request.RequestType = employee.Id % 2 == 0 ? "SUPPLEMENT" : "ADJUSTMENT";
            request.OriginalCheckIn = workDate.AddHours(8).AddMinutes(45);
            request.OriginalCheckOut = workDate.AddHours(17);
            request.RequestedCheckIn = workDate.AddHours(8).AddMinutes(10);
            request.RequestedCheckOut = workDate.AddHours(17).AddMinutes(35);
            request.Reason = reason;
            request.WorkReportTitle = $"{Marker} Bổ sung dữ liệu chấm công";
            request.WorkReportDescription = "Đối chiếu lịch làm việc và báo cáo công việc trong ngày.";
            request.Status = status;
            request.ReviewedById = status == "PENDING" ? null : managerId;
            request.ReviewNote = status switch
            {
                "APPROVED" => "Đã đối chiếu lịch ca và xác nhận hợp lệ.",
                "REJECTED" => "Chưa đủ bằng chứng để điều chỉnh giờ làm.",
                _ => null
            };
            request.SubmittedAt = workDate.AddDays(1).AddHours(8);
            request.ReviewedAt = status == "PENDING"
                ? null
                : workDate.AddDays(1).AddHours(14);
        }

        private async Task SeedPayrollAsync(
            Employee employee,
            DateTime periodStart,
            ScenarioProfile profile,
            bool isCurrentPeriod)
        {
            var payroll = await _db.Payrolls.FirstOrDefaultAsync(row =>
                row.EmployeeId == employee.Id
                && row.Month == periodStart.Month
                && row.Year == periodStart.Year);
            if (payroll != null)
            {
                return;
            }

            var salaryBase = employee.SalaryBase ?? 0;
            var bonus = isCurrentPeriod ? profile.CurrentBonus : profile.PreviousBonus;
            var deductions = isCurrentPeriod ? profile.CurrentDeductions : profile.PreviousDeductions;
            _db.Payrolls.Add(new Payroll
            {
                EmployeeId = employee.Id,
                Month = periodStart.Month,
                Year = periodStart.Year,
                SalaryBase = salaryBase,
                Bonus = bonus,
                Deductions = deductions,
                TotalSalary = salaryBase + bonus - deductions,
                Status = isCurrentPeriod ? "Chờ thanh toán" : "Đã thanh toán"
            });
        }

        private async Task SeedTasksAsync(
            Employee employee,
            int managerId,
            DateTime periodStart,
            ScenarioProfile profile,
            bool isCurrentPeriod)
        {
            var baseScore = isCurrentPeriod ? profile.CurrentTaskScore : profile.PreviousTaskScore;
            var taskStatuses = BuildTaskStatuses(employee.Id, isCurrentPeriod);
            var taskNames = TaskNames(employee.DepartmentId);

            for (var index = 0; index < taskNames.Length; index++)
            {
                var title = $"{Marker} {periodStart:MM/yyyy} - NV{employee.Id:000} - {taskNames[index]}";
                var task = await _db.Tasks.FirstOrDefaultAsync(row => row.Title == title);
                if (task == null)
                {
                    task = new EmployeeTask();
                    _db.Tasks.Add(task);
                }

                var deadlineDay = Math.Min(8 + index * 8, DateTime.DaysInMonth(periodStart.Year, periodStart.Month));
                var deadline = NextWeekday(new DateTime(periodStart.Year, periodStart.Month, deadlineDay))
                    .AddHours(17);
                var status = taskStatuses[index];
                var progress = status == "APPROVED"
                    ? 100
                    : status == "REVISION_REQUIRED"
                        ? 75
                        : 60;

                task.EmployeeId = employee.Id;
                task.ManagerId = managerId;
                task.DepartmentId = employee.DepartmentId;
                task.Title = title;
                task.Description =
                    $"Mục tiêu kỳ {periodStart:MM/yyyy}: {TaskDescription(employee.DepartmentId, index)}";
                task.Deadline = deadline;
                task.Priority = index == 0 ? "HIGH" : index == 1 ? "MEDIUM" : "LOW";
                task.Status = status;
                task.ProgressPercent = progress;
                task.ExpectedScore = 100;
                task.CreatedAt = deadline.AddDays(-12);
                task.UpdatedAt = deadline.AddHours(index - 2);

                await _db.SaveChangesAsync();

                var progressValues = new[] { 30, 70, progress };
                for (var progressIndex = 0; progressIndex < progressValues.Length; progressIndex++)
                {
                    var note = $"{Marker} {periodStart:MM/yyyy} - Task {index + 1} - Mốc {progressValues[progressIndex]}%";
                    var log = await _db.TaskProgressLogs.FirstOrDefaultAsync(row =>
                        row.TaskId == task.Id && row.Note == note);
                    if (log == null)
                    {
                        log = new TaskProgressLog();
                        _db.TaskProgressLogs.Add(log);
                    }

                    log.TaskId = task.Id;
                    log.EmployeeId = employee.Id;
                    log.ProgressPercent = progressValues[progressIndex];
                    log.Note = note;
                    log.CreatedAt = task.CreatedAt.AddDays(3 + progressIndex * 3);
                }

                var comment = $"{Marker} {periodStart:MM/yyyy} - Review {taskNames[index]}";
                var review = await _db.TaskReviews.FirstOrDefaultAsync(row =>
                    row.TaskId == task.Id && row.Comment == comment);
                if (review == null)
                {
                    review = new TaskReview();
                    _db.TaskReviews.Add(review);
                }

                var score = Math.Clamp(baseScore + (index - 1) * 3, 55, 98);
                review.TaskId = task.Id;
                review.ManagerId = managerId;
                review.QualityScore = score;
                review.DeadlineScore = status == "REVISION_REQUIRED"
                    ? Math.Max(55, score - 8)
                    : Math.Min(100, score + 2);
                review.Decision = status == "REVISION_REQUIRED" ? "REVISION_REQUIRED" : "APPROVED";
                review.Comment = comment;
                review.CreatedAt = deadline.AddHours(2);
            }
        }

        private async Task<int> ResolveManagerIdAsync(Employee employee, int adminId)
        {
            if (employee.Role == "MANAGER")
            {
                return adminId;
            }

            var managerId = await _db.Employees
                .AsNoTracking()
                .Where(candidate =>
                    candidate.Role == "MANAGER"
                    && candidate.DepartmentId == employee.DepartmentId
                    && candidate.Status != "inactive"
                    && candidate.Status != "Đã nghỉ việc")
                .Select(candidate => (int?)candidate.Id)
                .FirstOrDefaultAsync();

            return managerId ?? adminId;
        }

        private static ScenarioProfile BuildProfile(int employeeId)
        {
            return employeeId switch
            {
                5 => new ScenarioProfile(1, 0, 1, 0, 87, 93, 8_000_000, 12_000_000, 700_000, 500_000, "APPROVED", "Đã duyệt", false),
                6 => new ScenarioProfile(4, 1, 2, 0, 78, 92, 500_000, 2_000_000, 650_000, 250_000, "PENDING", "Chờ duyệt", true),
                7 => new ScenarioProfile(0, 3, 0, 2, 94, 76, 3_000_000, 1_000_000, 250_000, 900_000, "REJECTED", "Từ chối", false),
                8 => new ScenarioProfile(2, 0, 1, 0, 84, 91, 5_000_000, 8_000_000, 500_000, 300_000, "APPROVED", "Đã duyệt", false),
                _ => new ScenarioProfile(2, 1, 1, 0, 82, 88, 1_000_000, 1_500_000, 400_000, 300_000, "PENDING", "Chờ duyệt", false)
            };
        }

        private static string[] BuildTaskStatuses(int employeeId, bool isCurrentPeriod)
        {
            if (!isCurrentPeriod && employeeId == 6)
                return new[] { "APPROVED", "APPROVED", "REVISION_REQUIRED" };
            if (isCurrentPeriod && employeeId == 7)
                return new[] { "APPROVED", "REVISION_REQUIRED", "APPROVED" };
            return new[] { "APPROVED", "APPROVED", "APPROVED" };
        }

        private static string[] TaskNames(int? departmentId)
        {
            return departmentId switch
            {
                1 => new[] { "Hoàn thiện API HRM", "Kiểm thử tích hợp hệ thống", "Tối ưu quy trình triển khai" },
                2 => new[] { "Rà soát hồ sơ nhân sự", "Cập nhật quy trình onboarding", "Tổng hợp báo cáo nhân sự" },
                3 => new[] { "Đối soát chứng từ", "Lập báo cáo chi phí", "Kiểm tra dữ liệu lương" },
                4 => new[] { "Lập kế hoạch nội dung", "Theo dõi chiến dịch", "Báo cáo hiệu quả marketing" },
                _ => new[] { "Hoàn thành công việc tháng", "Phối hợp liên phòng ban", "Tổng hợp báo cáo kết quả" }
            };
        }

        private static string TaskDescription(int? departmentId, int index)
        {
            var focus = departmentId switch
            {
                1 => "đảm bảo chức năng ổn định, có kiểm thử và tài liệu kỹ thuật",
                2 => "đảm bảo hồ sơ đầy đủ, quy trình rõ ràng và đúng chính sách",
                3 => "đảm bảo số liệu chính xác, có đối chiếu và truy vết",
                4 => "đảm bảo kế hoạch đúng tiến độ và có chỉ số đo lường",
                _ => "đảm bảo đúng yêu cầu, tiến độ và chất lượng đầu ra"
            };
            return $"Hoàn thành đầu việc số {index + 1}, {focus}.";
        }

        private static string WorkTitle(int? departmentId, int index)
        {
            return departmentId switch
            {
                1 => index % 2 == 0 ? "Phát triển và kiểm thử HRM" : "Rà soát lỗi tích hợp",
                2 => index % 2 == 0 ? "Xử lý hồ sơ nhân sự" : "Cập nhật báo cáo HR",
                3 => "Đối soát dữ liệu kế toán",
                4 => "Theo dõi chiến dịch marketing",
                _ => "Xử lý công việc chuyên môn"
            };
        }

        private static string LeaveReason(int employeeId)
        {
            return (employeeId % 3) switch
            {
                0 => "giải quyết việc gia đình",
                1 => "khám sức khỏe định kỳ",
                _ => "nghỉ phép cá nhân theo kế hoạch"
            };
        }

        private static string AttendanceRequestReason(int employeeId)
        {
            return employeeId % 2 == 0
                ? "Quên check-out sau khi hoàn thành ca"
                : "Đề nghị điều chỉnh giờ do làm việc ngoài văn phòng";
        }

        private static decimal CalculateWorkingHours(TimeSpan checkIn, TimeSpan? checkOut)
        {
            if (!checkOut.HasValue || checkOut.Value <= checkIn)
                return 0;

            var hours = (decimal)(checkOut.Value - checkIn).TotalHours;
            var overlapsLunch = checkIn < new TimeSpan(13, 0, 0)
                && checkOut.Value > new TimeSpan(12, 0, 0);
            if (overlapsLunch)
                hours -= 1;

            return Math.Max(0, Math.Round(hours, 2));
        }

        private static List<DateTime> BusinessDays(DateTime from, DateTime to)
        {
            var result = new List<DateTime>();
            for (var date = from.Date; date <= to.Date; date = date.AddDays(1))
            {
                if (date.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
                    result.Add(date);
            }
            return result;
        }

        private static HashSet<int> SpreadIndices(int total, int count, int offset = 0)
        {
            var result = new HashSet<int>();
            if (total == 0 || count <= 0) return result;

            for (var index = 0; index < Math.Min(count, total); index++)
            {
                var value = (int)Math.Round((index + 1) * (double)total / (count + 1));
                result.Add(Math.Clamp(value - 1 + offset, 0, total - 1));
            }
            return result;
        }

        private static DateTime NextWeekday(DateTime date)
        {
            while (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                date = date.AddDays(1);
            return date.Date;
        }

        private record ScenarioProfile(
            int PreviousLateDays,
            int CurrentLateDays,
            int PreviousEarlyDays,
            int CurrentEarlyDays,
            int PreviousTaskScore,
            int CurrentTaskScore,
            decimal PreviousBonus,
            decimal CurrentBonus,
            decimal PreviousDeductions,
            decimal CurrentDeductions,
            string CurrentAttendanceRequestStatus,
            string CurrentLeaveStatus,
            bool HasCurrentIncompleteDay);
    }

    public class Cdio4SeedSummary
    {
        public int EmployeeCount { get; set; }
        public List<string> Employees { get; set; } = new();
        public string PreviousPeriod { get; set; } = "";
        public string CurrentPeriod { get; set; } = "";
        public int AttendanceRows { get; set; }
        public int ShiftRows { get; set; }
        public int AttendanceRequestRows { get; set; }
        public int LeaveRows { get; set; }
        public int PayrollRows { get; set; }
        public int TaskRows { get; set; }
        public int ProgressRows { get; set; }
        public int ReviewRows { get; set; }
    }
}
