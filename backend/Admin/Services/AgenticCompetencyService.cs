using Admin.Data;
using Admin.DTOs;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class AgenticCompetencyService
    {
        private readonly AppDbContext _db;

        public AgenticCompetencyService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<AgenticCompetencyReviewDto>> GetManagerReviews(int managerId, int month, int year)
        {
            var manager = await GetManagerOrThrow(managerId);
            var query = BaseReviewQuery()
                .Where(r => r.ReviewMonth == month && r.ReviewYear == year);

            if (!IsAdmin(manager))
            {
                query = query.Where(r =>
                    r.DepartmentId == manager.DepartmentId
                    && r.EmployeeId != manager.Id
                    && r.Employee != null
                    && r.Employee.Role == "EMPLOYEE"
                    && r.Employee.Status != "inactive"
                    && r.Employee.Status != "da nghi viec"
                    && r.Employee.Status != "Đã nghỉ việc");
            }

            var reviews = await query
                .OrderByDescending(r => r.TotalScore)
                .ThenBy(r => r.Employee!.FullName)
                .ToListAsync();

            return reviews.Select(MapReview).ToList();
        }

        public async Task<CompetencyInputDataDto> GetInputData(int managerId, int employeeId, int month, int year)
        {
            NormalizePeriod(ref month, ref year);

            var manager = await GetManagerOrThrow(managerId);
            var employee = await _db.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == employeeId);

            if (employee == null)
                throw new InvalidOperationException("Không tìm thấy nhân viên cần đánh giá.");

            EnsureManagerCanAccessEmployee(manager, employee);

            var from = new DateTime(year, month, 1);
            var to = from.AddMonths(1).AddTicks(-1);

            var tasks = await _db.Tasks
                .Include(t => t.Employee)
                .Include(t => t.Manager)
                .Include(t => t.Department)
                .Include(t => t.Reviews)
                .AsNoTracking()
                .Where(t => t.EmployeeId == employeeId)
                .Where(t => t.Deadline >= from && t.Deadline <= to)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var taskIds = tasks.Select(t => t.Id).ToList();

            var progressLogs = taskIds.Count == 0
                ? new List<TaskProgressLog>()
                : await _db.TaskProgressLogs
                    .AsNoTracking()
                    .Where(x => taskIds.Contains(x.TaskId))
                    .ToListAsync();

            var attendance = await _db.Attendances
                .AsNoTracking()
                .Where(a => a.EmployeeId == employeeId && a.Date >= from && a.Date <= to)
                .ToListAsync();

            var approvedLeaveDays = await GetApprovedLeaveDays(employeeId, from, to);

            var reviews = tasks
                .SelectMany(t => t.Reviews)
                .ToList();

            return new CompetencyInputDataDto
            {
                EmployeeId = employee.Id,
                EmployeeName = employee.FullName,
                DepartmentId = employee.DepartmentId,
                DepartmentName = employee.Department?.Name,
                PositionTitle = employee.Position?.Title,
                Month = month,
                Year = year,
                TotalTasks = tasks.Count,
                ApprovedTasks = tasks.Count(t => t.Status == "APPROVED"),
                RejectedTasks = tasks.Count(t => t.Status == "REJECTED"),
                RevisionTasks = tasks.Count(t => t.Status == "REVISION_REQUIRED"),
                OverdueTasks = tasks.Count(IsOverdue),
                AverageProgress = tasks.Count == 0 ? 0 : Math.Round((decimal)tasks.Average(t => t.ProgressPercent), 2),
                AverageQualityScore = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(r => r.QualityScore), 2),
                AverageDeadlineScore = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(r => r.DeadlineScore), 2),
                ProgressUpdateCount = progressLogs.Count,
                AttendanceDays = attendance.Count,
                LateDays = attendance.Count(IsLate),
                EarlyLeaveDays = attendance.Count(IsEarlyLeave),
                IncompleteAttendanceDays = attendance.Count(IsIncompleteAttendance),
                ApprovedLeaveDays = approvedLeaveDays,
                Tasks = tasks.Select(MapTask).ToList()
            };
        }

        public async Task<AgenticCompetencyReviewDto> PersistWorkflowReview(
            int managerId,
            CompetencyInputDataDto input,
            AgenticEmployeeAnalysisDto analysis,
            AgenticRecommendationDto? recommendation)
        {
            var manager = await GetManagerOrThrow(managerId);
            var employee = await _db.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == input.EmployeeId);

            if (employee == null)
                throw new InvalidOperationException("Không tìm thấy nhân viên cần lưu đánh giá.");

            EnsureManagerCanAccessEmployee(manager, employee);

            var review = await _db.CompetencyReviews
                .FirstOrDefaultAsync(r =>
                    r.EmployeeId == input.EmployeeId
                    && r.ReviewMonth == input.Month
                    && r.ReviewYear == input.Year);

            var now = DateTime.Now;
            if (review == null)
            {
                review = new CompetencyReview
                {
                    EmployeeId = input.EmployeeId,
                    ReviewMonth = input.Month,
                    ReviewYear = input.Year,
                    CreatedAt = now
                };
                _db.CompetencyReviews.Add(review);
            }

            review.ManagerId = managerId;
            review.DepartmentId = employee.DepartmentId;
            review.AttendanceScore = analysis.AttendanceScore;
            review.TaskPerformanceScore = analysis.TaskPerformanceScore;
            review.QualitySkillScore = analysis.QualitySkillScore;
            review.DisciplineResponsibilityScore = analysis.DisciplineResponsibilityScore;
            review.TotalScore = analysis.TotalScore;
            review.Rating = analysis.Rating;
            review.AiSummary = BuildWorkflowSummary(input, analysis);
            review.AiRecommendation = recommendation == null
                ? "Reflection Agent chưa xác nhận được khuyến nghị phù hợp."
                : $"{recommendation.Action}. {recommendation.Reason} Policy: {recommendation.PolicyReference}.";
            review.Status = "PENDING_APPROVAL";
            review.UpdatedAt = now;

            await _db.SaveChangesAsync();

            var saved = await BaseReviewQuery().FirstAsync(r => r.Id == review.Id);
            return MapReview(saved);
        }

        public async Task<AgenticCompetencyReviewDto?> ApproveReview(int managerId, int reviewId, string? managerNote)
        {
            return await UpdateReviewDecision(managerId, reviewId, "APPROVED", managerNote);
        }

        public async Task<AgenticCompetencyReviewDto?> RejectReview(int managerId, int reviewId, string? managerNote)
        {
            return await UpdateReviewDecision(managerId, reviewId, "REJECTED", managerNote);
        }

        private async Task<AgenticCompetencyReviewDto?> UpdateReviewDecision(int managerId, int reviewId, string status, string? managerNote)
        {
            var manager = await GetManagerOrThrow(managerId);
            var review = await _db.CompetencyReviews
                .Include(r => r.Employee)
                .FirstOrDefaultAsync(r => r.Id == reviewId);

            if (review == null) return null;

            if (!IsAdmin(manager) && review.DepartmentId != manager.DepartmentId)
                throw new InvalidOperationException("Manager chỉ được duyệt đánh giá trong phòng ban của mình.");

            review.Status = status;
            review.ManagerId = managerId;
            review.ManagerNote = managerNote?.Trim();
            review.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();

            var saved = await BaseReviewQuery().FirstAsync(r => r.Id == review.Id);
            return MapReview(saved);
        }

        private IQueryable<CompetencyReview> BaseReviewQuery()
        {
            return _db.CompetencyReviews
                .AsNoTracking()
                .Include(r => r.Employee)
                .Include(r => r.Manager)
                .Include(r => r.Department);
        }

        private async Task<Employee> GetManagerOrThrow(int managerId)
        {
            var manager = await _db.Employees.FirstOrDefaultAsync(e => e.Id == managerId);
            if (manager == null)
                throw new InvalidOperationException("Không tìm thấy Manager.");

            if (!IsManager(manager) && !IsAdmin(manager))
                throw new InvalidOperationException("Tài khoản này không có quyền Manager.");

            return manager;
        }

        private static void EnsureManagerCanAccessEmployee(Employee manager, Employee employee)
        {
            if (IsAdmin(manager)) return;

            if (manager.DepartmentId == null || manager.DepartmentId != employee.DepartmentId)
                throw new InvalidOperationException("Manager chỉ được đánh giá nhân viên cùng phòng ban.");

            if (manager.Id == employee.Id)
                throw new InvalidOperationException("Manager không được tự đánh giá chính mình.");

            if (!IsEmployee(employee))
                throw new InvalidOperationException("Manager chỉ được đánh giá nhân viên cấp dưới.");

            if (IsInactive(employee))
                throw new InvalidOperationException("Nhân viên đã nghỉ việc không nằm trong danh sách đánh giá team hiện tại.");
        }

        private async Task<int> GetApprovedLeaveDays(int employeeId, DateTime from, DateTime to)
        {
            var leaves = await _db.LeaveRequests
                .AsNoTracking()
                .Where(l => l.EmployeeId == employeeId && l.Status == "Đã duyệt")
                .Where(l => l.StartDate <= to && l.EndDate >= from)
                .ToListAsync();

            return leaves.Sum(l =>
            {
                var start = l.StartDate < from ? from : l.StartDate;
                var end = l.EndDate > to ? to : l.EndDate;
                return Math.Max(0, (end.Date - start.Date).Days + 1);
            });
        }

        private static string BuildWorkflowSummary(
            CompetencyInputDataDto input,
            AgenticEmployeeAnalysisDto analysis)
        {
            var findings = analysis.Findings.Count > 0
                ? string.Join(" ", analysis.Findings)
                : "Chưa có phát hiện chi tiết.";
            var causes = analysis.RootCauses.Count > 0
                ? $" Điểm cần lưu ý: {string.Join(" ", analysis.RootCauses)}"
                : "";

            return $"{input.EmployeeName} được xếp loại {analysis.Rating} với tổng điểm {analysis.TotalScore}. "
                + $"{findings}{causes}";
        }

        private static AgenticCompetencyReviewDto MapReview(CompetencyReview review)
        {
            return new AgenticCompetencyReviewDto
            {
                Id = review.Id,
                EmployeeId = review.EmployeeId,
                EmployeeName = review.Employee?.FullName ?? "",
                ManagerId = review.ManagerId,
                ManagerName = review.Manager?.FullName,
                DepartmentId = review.DepartmentId,
                DepartmentName = review.Department?.Name,
                Month = review.ReviewMonth,
                Year = review.ReviewYear,
                AttendanceScore = review.AttendanceScore,
                TaskPerformanceScore = review.TaskPerformanceScore,
                QualitySkillScore = review.QualitySkillScore,
                DisciplineResponsibilityScore = review.DisciplineResponsibilityScore,
                TotalScore = review.TotalScore,
                Rating = review.Rating,
                AiSummary = review.AiSummary,
                AiRecommendation = review.AiRecommendation,
                ManagerNote = review.ManagerNote,
                Status = review.Status,
                CreatedAt = review.CreatedAt,
                UpdatedAt = review.UpdatedAt
            };
        }

        private static TaskDto MapTask(EmployeeTask task)
        {
            var latestReview = task.Reviews
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefault();

            return new TaskDto
            {
                Id = task.Id,
                EmployeeId = task.EmployeeId,
                EmployeeName = task.Employee?.FullName ?? "",
                ManagerId = task.ManagerId,
                ManagerName = task.Manager?.FullName ?? "",
                DepartmentId = task.DepartmentId,
                DepartmentName = task.Department?.Name,
                Title = task.Title,
                Description = task.Description,
                Deadline = task.Deadline,
                Priority = task.Priority,
                Status = task.Status,
                ProgressPercent = task.ProgressPercent,
                ExpectedScore = task.ExpectedScore,
                IsOverdue = IsOverdue(task),
                CreatedAt = task.CreatedAt,
                UpdatedAt = task.UpdatedAt,
                LatestReview = latestReview == null
                    ? null
                    : new TaskReviewDto
                    {
                        Id = latestReview.Id,
                        TaskId = latestReview.TaskId,
                        ManagerId = latestReview.ManagerId,
                        ManagerName = task.Manager?.FullName ?? "",
                        QualityScore = latestReview.QualityScore,
                        DeadlineScore = latestReview.DeadlineScore,
                        Decision = latestReview.Decision,
                        Comment = latestReview.Comment,
                        CreatedAt = latestReview.CreatedAt
                    }
            };
        }

        private static bool IsOverdue(EmployeeTask task)
        {
            return task.Deadline < DateTime.Now && task.Status is not "APPROVED";
        }

        private static bool IsLate(Attendance attendance)
        {
            return attendance.CheckInTime.HasValue && attendance.CheckInTime.Value > new TimeSpan(8, 30, 0);
        }

        private static bool IsEarlyLeave(Attendance attendance)
        {
            return attendance.CheckOutTime.HasValue && attendance.CheckOutTime.Value < new TimeSpan(17, 30, 0);
        }

        private static bool IsIncompleteAttendance(Attendance attendance)
        {
            return attendance.CheckInTime == null || attendance.CheckOutTime == null;
        }

        private static void NormalizePeriod(ref int month, ref int year)
        {
            var now = DateTime.Now;
            if (month < 1 || month > 12) month = now.Month;
            if (year < 2000) year = now.Year;
        }

        private static bool IsManager(Employee employee)
        {
            return string.Equals(employee.Role, "MANAGER", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsAdmin(Employee employee)
        {
            return string.Equals(employee.Role, "ADMIN", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsEmployee(Employee employee)
        {
            return string.Equals(employee.Role, "EMPLOYEE", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsInactive(Employee employee)
        {
            return string.Equals(employee.Status, "inactive", StringComparison.OrdinalIgnoreCase)
                || string.Equals(employee.Status, "da nghi viec", StringComparison.OrdinalIgnoreCase)
                || string.Equals(employee.Status, "Đã nghỉ việc", StringComparison.OrdinalIgnoreCase);
        }

    }
}
