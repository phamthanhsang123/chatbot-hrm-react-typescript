using Admin.Data;
using Admin.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services.Agentic
{
    public class TaskTool
    {
        private readonly AppDbContext _db;

        public TaskTool(AppDbContext db)
        {
            _db = db;
        }

        public async Task<AgenticTaskEvidenceDto> GetTaskSummaryAsync(
            TargetEmployeeDto employee,
            int month,
            int year)
        {
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1);
            var now = DateTime.Now;

            var rows = await _db.Tasks
                .AsNoTracking()
                .Include(item => item.Reviews)
                .Where(item =>
                    item.EmployeeId == employee.Id
                    && item.Deadline >= periodStart
                    && item.Deadline < periodEnd)
                .OrderBy(item => item.Deadline)
                .ToListAsync();

            var tasks = rows.Select(item =>
            {
                var latestReview = item.Reviews
                    .OrderByDescending(review => review.CreatedAt)
                    .FirstOrDefault();
                return new AgenticTaskItemEvidenceDto
                {
                    TaskId = item.Id,
                    Title = item.Title,
                    Deadline = item.Deadline,
                    Priority = item.Priority,
                    Status = item.Status,
                    ProgressPercent = item.ProgressPercent,
                    IsOverdue = item.Deadline < now && item.Status != "APPROVED",
                    QualityScore = latestReview?.QualityScore,
                    DeadlineScore = latestReview?.DeadlineScore
                };
            }).ToList();

            var reviewedTasks = tasks.Where(item => item.QualityScore.HasValue).ToList();
            return new AgenticTaskEvidenceDto
            {
                EmployeeId = employee.Id,
                EmployeeName = employee.FullName,
                DepartmentName = employee.DepartmentName,
                Month = month,
                Year = year,
                TotalTasks = tasks.Count,
                ApprovedTasks = tasks.Count(item => item.Status == "APPROVED"),
                SubmittedTasks = tasks.Count(item => item.Status == "SUBMITTED"),
                InProgressTasks = tasks.Count(item => item.Status is "NEW" or "IN_PROGRESS"),
                RevisionTasks = tasks.Count(item => item.Status == "REVISION_REQUIRED"),
                RejectedTasks = tasks.Count(item => item.Status == "REJECTED"),
                OverdueTasks = tasks.Count(item => item.IsOverdue),
                AverageProgress = tasks.Count == 0
                    ? 0
                    : Math.Round((decimal)tasks.Average(item => item.ProgressPercent), 2),
                AverageQualityScore = reviewedTasks.Count == 0
                    ? null
                    : Math.Round(reviewedTasks.Average(item => item.QualityScore!.Value), 2),
                Rule = "Task thuộc kỳ theo deadline; chỉ APPROVED được tính hoàn thành; quá hạn khi qua deadline nhưng chưa APPROVED.",
                Tasks = tasks
            };
        }
    }
}
