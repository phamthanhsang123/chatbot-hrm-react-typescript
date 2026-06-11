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
                query = query.Where(r => r.DepartmentId == manager.DepartmentId || r.ManagerId == manager.Id);
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
                .Where(t => t.CreatedAt <= to && t.Deadline >= from)
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

        public async Task<AgenticCompetencyReviewDto> GenerateReview(int managerId, int employeeId, int month, int year)
        {
            NormalizePeriod(ref month, ref year);

            var input = await GetInputData(managerId, employeeId, month, year);
            var employee = await _db.Employees
                .AsNoTracking()
                .FirstAsync(e => e.Id == employeeId);

            var attendanceScore = CalculateAttendanceScore(input);
            var taskPerformanceScore = CalculateTaskPerformanceScore(input);
            var qualitySkillScore = CalculateQualitySkillScore(input);
            var disciplineScore = CalculateDisciplineResponsibilityScore(input);
            var totalScore = Math.Round(
                attendanceScore * 0.20m
                + taskPerformanceScore * 0.40m
                + qualitySkillScore * 0.25m
                + disciplineScore * 0.15m,
                2
            );

            var rating = GetRating(totalScore);
            var summary = BuildSummary(input, attendanceScore, taskPerformanceScore, qualitySkillScore, disciplineScore, totalScore, rating);
            var recommendation = BuildRecommendation(input, rating, attendanceScore, taskPerformanceScore, qualitySkillScore, disciplineScore);

            var review = await _db.CompetencyReviews
                .FirstOrDefaultAsync(r => r.EmployeeId == employeeId && r.ReviewMonth == month && r.ReviewYear == year);

            var now = DateTime.Now;
            if (review == null)
            {
                review = new CompetencyReview
                {
                    EmployeeId = employeeId,
                    ManagerId = managerId,
                    DepartmentId = employee.DepartmentId,
                    ReviewMonth = month,
                    ReviewYear = year,
                    CreatedAt = now
                };

                _db.CompetencyReviews.Add(review);
            }

            review.ManagerId = managerId;
            review.DepartmentId = employee.DepartmentId;
            review.AttendanceScore = attendanceScore;
            review.TaskPerformanceScore = taskPerformanceScore;
            review.QualitySkillScore = qualitySkillScore;
            review.DisciplineResponsibilityScore = disciplineScore;
            review.TotalScore = totalScore;
            review.Rating = rating;
            review.AiSummary = summary;
            review.AiRecommendation = recommendation;
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

        private static decimal CalculateAttendanceScore(CompetencyInputDataDto input)
        {
            if (input.AttendanceDays == 0)
                return input.ApprovedLeaveDays > 0 ? 85 : 75;

            var penalty = input.LateDays * 4
                + input.EarlyLeaveDays * 3
                + input.IncompleteAttendanceDays * 5;

            var leaveAdjustment = Math.Min(input.ApprovedLeaveDays * 1.5m, 8);
            return ClampScore(100 - penalty + leaveAdjustment);
        }

        private static decimal CalculateTaskPerformanceScore(CompetencyInputDataDto input)
        {
            if (input.TotalTasks == 0) return 70;

            var approvedRatio = (decimal)input.ApprovedTasks / input.TotalTasks;
            var submittedOrApproved = input.Tasks.Count(t => t.Status is "SUBMITTED" or "APPROVED");
            var submittedRatio = (decimal)submittedOrApproved / input.TotalTasks;
            var overduePenalty = input.OverdueTasks * 7;
            var rejectedPenalty = input.RejectedTasks * 8;

            var score = input.AverageProgress * 0.35m
                + approvedRatio * 45
                + submittedRatio * 20
                - overduePenalty
                - rejectedPenalty;

            return ClampScore(score);
        }

        private static decimal CalculateQualitySkillScore(CompetencyInputDataDto input)
        {
            if (input.AverageQualityScore <= 0) return input.TotalTasks == 0 ? 75 : 70;

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

        private static string BuildSummary(
            CompetencyInputDataDto input,
            decimal attendance,
            decimal taskPerformance,
            decimal qualitySkill,
            decimal discipline,
            decimal total,
            string rating)
        {
            return $"{input.EmployeeName} được xếp loại {rating} với tổng điểm {total}. "
                + $"Dữ liệu tháng {input.Month}/{input.Year} gồm {input.TotalTasks} task, "
                + $"{input.ApprovedTasks} task đã duyệt, {input.OverdueTasks} task quá hạn, "
                + $"{input.ProgressUpdateCount} lần cập nhật tiến độ. "
                + $"Điểm thành phần: chuyên cần {attendance}, hiệu suất task {taskPerformance}, "
                + $"chất lượng/kỹ năng {qualitySkill}, kỷ luật/trách nhiệm {discipline}.";
        }

        private static string BuildRecommendation(
            CompetencyInputDataDto input,
            string rating,
            decimal attendance,
            decimal taskPerformance,
            decimal qualitySkill,
            decimal discipline)
        {
            if (rating == "Xuất sắc")
            {
                return "Đề xuất giao task có độ khó cao hơn, cân nhắc khen thưởng hoặc đưa vào nhóm nhân sự nòng cốt.";
            }

            if (taskPerformance < 70)
            {
                return "Đề xuất Manager chia nhỏ task, theo dõi tiến độ hằng tuần và hỗ trợ xử lý các điểm nghẽn.";
            }

            if (qualitySkill < 70)
            {
                return "Đề xuất đào tạo kỹ năng chuyên môn hoặc mentoring với nhân sự có kinh nghiệm.";
            }

            if (attendance < 75 || discipline < 75)
            {
                return "Đề xuất trao đổi trực tiếp với nhân viên về kỷ luật, deadline và thói quen cập nhật tiến độ.";
            }

            if (rating == "Tốt")
            {
                return "Đề xuất duy trì nhịp giao việc hiện tại, bổ sung task thử thách hơn để phát triển năng lực.";
            }

            return "Đề xuất đặt mục tiêu rõ hơn trong kỳ tiếp theo và đánh giá lại sau 2-4 tuần.";
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
            return attendance.CheckInTime.HasValue && attendance.CheckInTime.Value.TimeOfDay > new TimeSpan(8, 0, 0);
        }

        private static bool IsEarlyLeave(Attendance attendance)
        {
            return attendance.CheckOutTime.HasValue && attendance.CheckOutTime.Value.TimeOfDay < new TimeSpan(17, 0, 0);
        }

        private static bool IsIncompleteAttendance(Attendance attendance)
        {
            return attendance.CheckInTime == null || attendance.CheckOutTime == null;
        }

        private static string GetRating(decimal totalScore)
        {
            if (totalScore >= 90) return "Xuất sắc";
            if (totalScore >= 80) return "Tốt";
            if (totalScore >= 65) return "Trung bình";
            return "Cần cải thiện";
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

        private static decimal ClampScore(decimal value)
        {
            return Math.Round(Math.Max(0, Math.Min(100, value)), 2);
        }
    }
}
