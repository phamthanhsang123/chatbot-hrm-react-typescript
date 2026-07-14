using Admin.Data;
using Admin.DTOs;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class TaskService
    {
        private readonly AppDbContext _db;

        public TaskService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<TaskDto>> GetManagerTasks(int managerId, int? month = null, int? year = null)
        {
            var manager = await GetManagerOrThrow(managerId);
            var query = BaseTaskQuery();

            if (!IsAdmin(manager))
            {
                query = query.Where(t => t.DepartmentId == manager.DepartmentId || t.ManagerId == manager.Id);
            }

            query = ApplyPeriodFilter(query, month, year);

            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return tasks.Select(MapTask).ToList();
        }

        public async Task<List<TaskDto>> GetEmployeeTasks(int employeeId, int? month = null, int? year = null)
        {
            var employeeExists = await _db.Employees.AnyAsync(e => e.Id == employeeId);
            if (!employeeExists)
                throw new InvalidOperationException("Không tìm thấy nhân viên.");

            var query = ApplyPeriodFilter(BaseTaskQuery(), month, year);

            var tasks = await query
                .Where(t => t.EmployeeId == employeeId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return tasks.Select(MapTask).ToList();
        }

        public async Task<TaskDto?> GetById(int id)
        {
            var task = await BaseTaskQuery().FirstOrDefaultAsync(t => t.Id == id);
            return task == null ? null : MapTask(task);
        }

        public async Task<TaskDto> Create(int managerId, CreateTaskDto dto)
        {
            ValidateCreate(dto);

            var manager = await GetManagerOrThrow(managerId);
            var employee = await _db.Employees
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.Id == dto.EmployeeId);

            if (employee == null)
                throw new InvalidOperationException("Không tìm thấy nhân viên nhận task.");

            EnsureManagerCanAccessEmployee(manager, employee);

            var now = DateTime.Now;
            var priority = NormalizePriority(dto.Priority);
            var task = new EmployeeTask
            {
                EmployeeId = employee.Id,
                ManagerId = manager.Id,
                DepartmentId = employee.DepartmentId,
                Title = dto.Title.Trim(),
                Description = dto.Description?.Trim(),
                Deadline = dto.Deadline,
                Priority = priority,
                Status = "NEW",
                ProgressPercent = 0,
                ExpectedScore = GetExpectedScoreByPriority(priority),
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();

            var created = await GetById(task.Id);
            return created ?? MapTask(task);
        }

        public async Task<TaskDto?> Update(int managerId, int taskId, UpdateTaskDto dto)
        {
            ValidateUpdate(dto);

            var manager = await GetManagerOrThrow(managerId);
            var task = await _db.Tasks
                .Include(t => t.Employee)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null) return null;

            EnsureManagerCanAccessTask(manager, task);

            if (task.Status == "APPROVED")
                throw new InvalidOperationException("Task đã duyệt thì không thể sửa.");

            task.Title = dto.Title.Trim();
            task.Description = dto.Description?.Trim();
            task.Deadline = dto.Deadline;
            task.Priority = NormalizePriority(dto.Priority);
            task.ExpectedScore = GetExpectedScoreByPriority(task.Priority);
            task.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
            return await GetById(task.Id);
        }

        public async Task<TaskDto?> UpdateProgress(int employeeId, int taskId, UpdateTaskProgressDto dto)
        {
            var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
            if (task == null) return null;

            if (task.EmployeeId != employeeId)
                throw new InvalidOperationException("Nhân viên chỉ được cập nhật task của chính mình.");

            if (task.Status is "APPROVED" or "REJECTED")
                throw new InvalidOperationException("Task đã đóng thì không thể cập nhật tiến độ.");

            task.ProgressPercent = ClampPercent(dto.ProgressPercent);
            task.Status = task.Status == "NEW" ? "IN_PROGRESS" : task.Status;
            task.UpdatedAt = DateTime.Now;

            _db.TaskProgressLogs.Add(new TaskProgressLog
            {
                TaskId = task.Id,
                EmployeeId = employeeId,
                ProgressPercent = task.ProgressPercent,
                Note = dto.Note?.Trim(),
                CreatedAt = DateTime.Now
            });

            await _db.SaveChangesAsync();
            return await GetById(task.Id);
        }

        public async Task<TaskDto?> Submit(int employeeId, int taskId)
        {
            var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
            if (task == null) return null;

            if (task.EmployeeId != employeeId)
                throw new InvalidOperationException("Nhân viên chỉ được gửi hoàn thành task của chính mình.");

            if (task.Status == "APPROVED")
                throw new InvalidOperationException("Task đã được Manager duyệt.");

            task.Status = "SUBMITTED";
            task.ProgressPercent = Math.Max(task.ProgressPercent, 100);
            task.UpdatedAt = DateTime.Now;

            _db.TaskProgressLogs.Add(new TaskProgressLog
            {
                TaskId = task.Id,
                EmployeeId = employeeId,
                ProgressPercent = task.ProgressPercent,
                Note = "Nhân viên gửi hoàn thành task.",
                CreatedAt = DateTime.Now
            });

            await _db.SaveChangesAsync();
            return await GetById(task.Id);
        }

        public async Task<TaskDto?> Review(int managerId, int taskId, ReviewTaskDto dto)
        {
            var manager = await GetManagerOrThrow(managerId);
            var task = await _db.Tasks
                .Include(t => t.Employee)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null) return null;

            EnsureManagerCanAccessTask(manager, task);

            var decision = NormalizeDecision(dto.Decision);
            var now = DateTime.Now;

            _db.TaskReviews.Add(new TaskReview
            {
                TaskId = task.Id,
                ManagerId = manager.Id,
                QualityScore = ClampScore(dto.QualityScore),
                DeadlineScore = ClampScore(dto.DeadlineScore),
                Decision = decision,
                Comment = dto.Comment?.Trim(),
                CreatedAt = now
            });

            task.Status = decision;
            if (decision == "APPROVED")
            {
                task.ProgressPercent = 100;
            }
            else if (decision == "REVISION_REQUIRED")
            {
                task.ProgressPercent = Math.Min(task.ProgressPercent, 99);
            }

            task.UpdatedAt = now;
            await _db.SaveChangesAsync();

            return await GetById(task.Id);
        }

        private IQueryable<EmployeeTask> BaseTaskQuery()
        {
            return _db.Tasks
                .AsNoTracking()
                .Include(t => t.Employee)
                .Include(t => t.Manager)
                .Include(t => t.Department)
                .Include(t => t.Reviews);
        }

        private static IQueryable<EmployeeTask> ApplyPeriodFilter(IQueryable<EmployeeTask> query, int? month, int? year)
        {
            if (!month.HasValue || !year.HasValue) return query;

            if (month < 1 || month > 12 || year < 2000)
                throw new InvalidOperationException("Kỳ đánh giá không hợp lệ.");

            var from = new DateTime(year.Value, month.Value, 1);
            var to = from.AddMonths(1).AddTicks(-1);

            return query.Where(t => t.Deadline >= from && t.Deadline <= to);
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
                throw new InvalidOperationException("Manager chỉ được thao tác với nhân viên cùng phòng ban.");
        }

        private static void EnsureManagerCanAccessTask(Employee manager, EmployeeTask task)
        {
            if (IsAdmin(manager)) return;

            if (manager.DepartmentId == null || manager.DepartmentId != task.DepartmentId)
                throw new InvalidOperationException("Manager chỉ được thao tác với task trong phòng ban của mình.");
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
                IsOverdue = task.Deadline < DateTime.Now && task.Status is not "APPROVED",
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

        private static void ValidateCreate(CreateTaskDto dto)
        {
            if (dto.EmployeeId <= 0)
                throw new InvalidOperationException("Thiếu nhân viên nhận task.");
            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new InvalidOperationException("Thiếu tiêu đề task.");
            if (dto.Deadline == default)
                throw new InvalidOperationException("Thiếu deadline task.");
        }

        private static void ValidateUpdate(UpdateTaskDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new InvalidOperationException("Thiếu tiêu đề task.");
            if (dto.Deadline == default)
                throw new InvalidOperationException("Thiếu deadline task.");
        }

        private static string NormalizePriority(string? priority)
        {
            return (priority ?? "MEDIUM").Trim().ToUpperInvariant() switch
            {
                "LOW" => "LOW",
                "HIGH" => "HIGH",
                "CRITICAL" => "CRITICAL",
                _ => "MEDIUM"
            };
        }

        private static string NormalizeDecision(string? decision)
        {
            return (decision ?? "APPROVED").Trim().ToUpperInvariant() switch
            {
                "REJECTED" => "REJECTED",
                "REVISION_REQUIRED" => "REVISION_REQUIRED",
                _ => "APPROVED"
            };
        }

        private static bool IsManager(Employee employee)
        {
            return string.Equals(employee.Role, "MANAGER", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsAdmin(Employee employee)
        {
            return string.Equals(employee.Role, "ADMIN", StringComparison.OrdinalIgnoreCase);
        }

        private static int ClampPercent(int value)
        {
            return Math.Max(0, Math.Min(100, value));
        }

        private static decimal ClampScore(decimal value)
        {
            return Math.Max(0, Math.Min(100, value));
        }

        private static decimal GetExpectedScoreByPriority(string priority)
        {
            return priority switch
            {
                "LOW" => 10,
                "MEDIUM" => 20,
                "HIGH" => 30,
                "CRITICAL" => 40,
                _ => 20
            };
        }
    }
}
