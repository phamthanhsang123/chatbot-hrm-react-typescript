using Admin.Data;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class DemoDataSeeder
    {
        private readonly AppDbContext _db;

        public DemoDataSeeder(AppDbContext db)
        {
            _db = db;
        }

        public async Task<object> SeedAsync()
        {
            var departments = await SeedDepartmentsAsync();
            var positions = await SeedPositionsAsync(departments);
            var employees = await SeedEmployeesAsync(departments, positions);
            var leaveTypes = await SeedLeaveTypesAsync();
            var payrolls = await SeedPayrollsAsync(employees);
            var attendances = await SeedAttendancesAsync(employees);
            var leaves = await SeedLeaveRequestsAsync(employees, leaveTypes);
            var tasks = await SeedTasksAsync(employees, departments);
            var reviews = await SeedCompetencyReviewsAsync(employees, departments);

            return new
            {
                message = "Seed demo data completed",
                departments = departments.Count,
                positions = positions.Count,
                employees = employees.Count,
                payrolls,
                attendances,
                leaveRequests = leaves,
                tasks,
                competencyReviews = reviews
            };
        }

        private async Task<Dictionary<string, Department>> SeedDepartmentsAsync()
        {
            var names = new[] { "IT", "HR", "Marketing", "Sales", "Finance" };
            foreach (var name in names)
            {
                if (!await _db.Departments.AnyAsync(x => x.Name == name))
                {
                    _db.Departments.Add(new Department { Name = name });
                }
            }

            await _db.SaveChangesAsync();
            return await _db.Departments
                .Where(x => names.Contains(x.Name))
                .ToDictionaryAsync(x => x.Name, x => x);
        }

        private async Task<Dictionary<string, Position>> SeedPositionsAsync(Dictionary<string, Department> departments)
        {
            var rows = new[]
            {
                new { Title = "HR Manager", Department = "HR" },
                new { Title = "Team Lead", Department = "IT" },
                new { Title = "Backend Developer", Department = "IT" },
                new { Title = "Marketing Executive", Department = "Marketing" },
                new { Title = "Sales Executive", Department = "Sales" }
            };

            foreach (var row in rows)
            {
                var departmentId = departments[row.Department].Id;
                if (!await _db.Positions.AnyAsync(x => x.Title == row.Title && x.DepartmentId == departmentId))
                {
                    _db.Positions.Add(new Position { Title = row.Title, DepartmentId = departmentId });
                }
            }

            await _db.SaveChangesAsync();
            var titles = rows.Select(x => x.Title).ToArray();
            return await _db.Positions
                .Where(x => titles.Contains(x.Title))
                .ToDictionaryAsync(x => x.Title, x => x);
        }

        private async Task<List<Employee>> SeedEmployeesAsync(Dictionary<string, Department> departments, Dictionary<string, Position> positions)
        {
            var rows = new[]
            {
                new { Email = "admin.demo@hrm.local", Name = "Admin HR Demo", Role = "ADMIN", Phone = "0901000101", Cccd = "049205000101", Department = "HR", Position = "HR Manager", Salary = 25000000m },
                new { Email = "manager.it@hrm.local", Name = "Le Van Kien Quan", Role = "MANAGER", Phone = "0901000102", Cccd = "049205000102", Department = "IT", Position = "Team Lead", Salary = 22000000m },
                new { Email = "employee01@hrm.local", Name = "Pham Thanh Sang", Role = "EMPLOYEE", Phone = "0901000103", Cccd = "049205000103", Department = "IT", Position = "Backend Developer", Salary = 15000000m },
                new { Email = "employee02@hrm.local", Name = "Ngo Vu Chinh", Role = "EMPLOYEE", Phone = "0901000104", Cccd = "049205000104", Department = "Marketing", Position = "Marketing Executive", Salary = 13000000m },
                new { Email = "employee03@hrm.local", Name = "Tran Thi Binh", Role = "EMPLOYEE", Phone = "0901000105", Cccd = "049205000105", Department = "Sales", Position = "Sales Executive", Salary = 14000000m }
            };

            foreach (var row in rows)
            {
                var employee = await _db.Employees.FirstOrDefaultAsync(x => x.Email == row.Email);
                if (employee == null)
                {
                    employee = new Employee { Email = row.Email };
                    _db.Employees.Add(employee);
                }

                employee.FullName = row.Name;
                employee.Role = row.Role;
                employee.Phone = row.Phone;
                employee.Cccd = row.Cccd;
                employee.Status = "Đang làm việc";
                employee.DepartmentId = departments[row.Department].Id;
                employee.PositionId = positions[row.Position].Id;
                employee.SalaryBase = row.Salary;
                employee.Password = BCrypt.Net.BCrypt.HashPassword("123456");
            }

            await _db.SaveChangesAsync();
            var emails = rows.Select(x => x.Email).ToArray();
            return await _db.Employees
                .Where(x => emails.Contains(x.Email))
                .OrderBy(x => x.Id)
                .ToListAsync();
        }

        private async Task<Dictionary<string, LeaveType>> SeedLeaveTypesAsync()
        {
            var names = new[] { "Nghỉ phép năm", "Nghỉ ốm", "Nghỉ không lương", "Nghỉ cưới", "Nghỉ tang" };
            foreach (var name in names)
            {
                if (!await _db.LeaveTypes.AnyAsync(x => x.Name == name))
                {
                    _db.LeaveTypes.Add(new LeaveType { Name = name });
                }
            }

            await _db.SaveChangesAsync();
            return await _db.LeaveTypes
                .Where(x => names.Contains(x.Name))
                .ToDictionaryAsync(x => x.Name, x => x);
        }

        private async Task<int> SeedPayrollsAsync(List<Employee> employees)
        {
            var now = DateTime.Today;
            var count = 0;
            foreach (var employee in employees.Take(5))
            {
                var payroll = await _db.Payrolls.FirstOrDefaultAsync(x =>
                    x.EmployeeId == employee.Id && x.Month == now.Month && x.Year == now.Year);

                if (payroll == null)
                {
                    payroll = new Payroll
                    {
                        EmployeeId = employee.Id,
                        Month = now.Month,
                        Year = now.Year
                    };
                    _db.Payrolls.Add(payroll);
                    count++;
                }

                var baseSalary = employee.SalaryBase ?? 0;
                payroll.SalaryBase = baseSalary;
                payroll.Bonus = employee.Role == "MANAGER" ? 2000000 : 1000000;
                payroll.Deductions = Math.Round(baseSalary * 0.105m, 0);
                payroll.TotalSalary = baseSalary + payroll.Bonus;
                payroll.Status = employee.Role == "ADMIN" ? "Đã thanh toán" : employee.Role == "MANAGER" ? "Chờ thanh toán" : "Chờ duyệt";
            }

            await _db.SaveChangesAsync();
            return count;
        }

        private async Task<int> SeedAttendancesAsync(List<Employee> employees)
        {
            var today = DateTime.Today;
            var count = 0;
            var offsets = new[] { 0, 8, 20, 35, 0 };

            for (var i = 0; i < employees.Take(5).Count(); i++)
            {
                var employee = employees[i];
                var row = await _db.Attendances.FirstOrDefaultAsync(x => x.EmployeeId == employee.Id && x.Date.Date == today);
                if (row == null)
                {
                    row = new Attendance { EmployeeId = employee.Id, Date = today };
                    _db.Attendances.Add(row);
                    count++;
                }

                var checkIn = today.AddHours(8).AddMinutes(offsets[i]);
                DateTime? checkOut = i == 4 ? null : today.AddHours(17).AddMinutes(20 + i * 5);
                row.CheckInTime = checkIn;
                row.CheckOutTime = checkOut;
                row.IsLate = offsets[i] > 0;
                row.IsEarlyLeave = checkOut.HasValue && checkOut.Value.TimeOfDay < new TimeSpan(17, 0, 0);
                row.TotalHours = checkOut.HasValue ? Math.Round((decimal)(checkOut.Value - checkIn).TotalHours, 2) : 0;
                row.Status = checkOut.HasValue ? "Completed" : "Working";
                row.Note = row.IsLate ? $"Đi muộn {offsets[i]} phút" : "-";
                row.CreatedAt = DateTime.Now;
                row.UpdatedAt = DateTime.Now;
            }

            await _db.SaveChangesAsync();
            return count;
        }

        private async Task<int> SeedLeaveRequestsAsync(List<Employee> employees, Dictionary<string, LeaveType> leaveTypes)
        {
            var today = DateTime.Today;
            var rows = employees.Take(5).Select((employee, index) => new
            {
                Employee = employee,
                Type = index == 1 ? "Nghỉ ốm" : index == 2 ? "Nghỉ không lương" : "Nghỉ phép năm",
                Start = today.AddDays(index + 2),
                End = today.AddDays(index + 2 + (index % 2)),
                Status = index < 2 ? "Chờ duyệt" : index == 2 ? "Từ chối" : "Đã duyệt",
                Reason = index == 1 ? "Khám sức khỏe" : index == 2 ? "Việc gia đình" : "Nghỉ theo kế hoạch cá nhân"
            }).ToList();

            var count = 0;
            foreach (var row in rows)
            {
                var leaveTypeId = leaveTypes[row.Type].Id;
                var exists = await _db.LeaveRequests.AnyAsync(x =>
                    x.EmployeeId == row.Employee.Id &&
                    x.StartDate.Date == row.Start.Date &&
                    x.EndDate.Date == row.End.Date);

                if (exists) continue;

                _db.LeaveRequests.Add(new LeaveRequest
                {
                    EmployeeId = row.Employee.Id,
                    LeaveTypeId = leaveTypeId,
                    StartDate = row.Start,
                    EndDate = row.End,
                    TotalDays = (row.End.Date - row.Start.Date).Days + 1,
                    Reason = row.Reason,
                    Status = row.Status,
                    CreatedAt = DateTime.Now
                });
                count++;
            }

            await _db.SaveChangesAsync();
            return count;
        }

        private async Task<int> SeedTasksAsync(List<Employee> employees, Dictionary<string, Department> departments)
        {
            var manager = employees.First(x => x.Role == "MANAGER");
            var assignees = employees.Where(x => x.Role != "ADMIN").Take(5).ToList();
            var titles = new[]
            {
                "Hoàn thiện API nhân viên",
                "Kiểm thử chức năng chấm công",
                "Chuẩn bị báo cáo năng lực",
                "Tối ưu giao diện xin nghỉ phép",
                "Tổng hợp dữ liệu lương tháng"
            };
            var statuses = new[] { "IN_PROGRESS", "SUBMITTED", "APPROVED", "REVISION_REQUIRED", "NEW" };
            var priorities = new[] { "HIGH", "MEDIUM", "HIGH", "LOW", "CRITICAL" };
            var count = 0;

            for (var i = 0; i < titles.Length; i++)
            {
                var employee = assignees[i % assignees.Count];
                var task = await _db.Tasks.FirstOrDefaultAsync(x => x.Title == titles[i] && x.EmployeeId == employee.Id);
                if (task == null)
                {
                    task = new EmployeeTask
                    {
                        Title = titles[i],
                        EmployeeId = employee.Id,
                        ManagerId = manager.Id,
                        DepartmentId = employee.DepartmentId ?? departments["IT"].Id,
                        CreatedAt = DateTime.Now,
                    };
                    _db.Tasks.Add(task);
                    count++;
                }

                task.Description = $"Dữ liệu demo cho luồng Manager giao task và Employee cập nhật tiến độ: {titles[i]}.";
                task.Deadline = DateTime.Today.AddDays(3 + i);
                task.Priority = priorities[i];
                task.Status = statuses[i];
                task.ProgressPercent = statuses[i] == "APPROVED" ? 100 : statuses[i] == "NEW" ? 0 : 65 + i * 5;
                task.ExpectedScore = 80 + i * 3;
                task.UpdatedAt = DateTime.Now;
            }

            await _db.SaveChangesAsync();

            var seededTasks = await _db.Tasks
                .Where(x => titles.Contains(x.Title))
                .ToListAsync();

            foreach (var task in seededTasks)
            {
                if (!await _db.TaskProgressLogs.AnyAsync(x => x.TaskId == task.Id))
                {
                    _db.TaskProgressLogs.Add(new TaskProgressLog
                    {
                        TaskId = task.Id,
                        EmployeeId = task.EmployeeId,
                        ProgressPercent = task.ProgressPercent,
                        Note = "Cập nhật tiến độ demo từ seed database.",
                        CreatedAt = DateTime.Now
                    });
                }

                if (task.Status is "APPROVED" or "REVISION_REQUIRED" &&
                    !await _db.TaskReviews.AnyAsync(x => x.TaskId == task.Id))
                {
                    _db.TaskReviews.Add(new TaskReview
                    {
                        TaskId = task.Id,
                        ManagerId = task.ManagerId,
                        QualityScore = task.Status == "APPROVED" ? 92 : 72,
                        DeadlineScore = task.Status == "APPROVED" ? 90 : 75,
                        Decision = task.Status == "APPROVED" ? "APPROVED" : "REVISION_REQUIRED",
                        Comment = task.Status == "APPROVED" ? "Hoàn thành tốt." : "Cần bổ sung minh chứng.",
                        CreatedAt = DateTime.Now
                    });
                }
            }

            await _db.SaveChangesAsync();
            return count;
        }

        private async Task<int> SeedCompetencyReviewsAsync(List<Employee> employees, Dictionary<string, Department> departments)
        {
            var manager = employees.First(x => x.Role == "MANAGER");
            var now = DateTime.Today;
            var count = 0;
            var scores = new[] { 92m, 86m, 81m, 74m, 68m };

            for (var i = 0; i < employees.Take(5).Count(); i++)
            {
                var employee = employees[i];
                var review = await _db.CompetencyReviews.FirstOrDefaultAsync(x =>
                    x.EmployeeId == employee.Id && x.ReviewMonth == now.Month && x.ReviewYear == now.Year);

                if (review == null)
                {
                    review = new CompetencyReview
                    {
                        EmployeeId = employee.Id,
                        ReviewMonth = now.Month,
                        ReviewYear = now.Year,
                        CreatedAt = DateTime.Now
                    };
                    _db.CompetencyReviews.Add(review);
                    count++;
                }

                var total = scores[i];
                review.ManagerId = manager.Id;
                review.DepartmentId = employee.DepartmentId ?? departments["IT"].Id;
                review.AttendanceScore = Math.Min(100, total + 2);
                review.TaskPerformanceScore = total;
                review.QualitySkillScore = Math.Min(100, total + 4);
                review.DisciplineResponsibilityScore = Math.Max(60, total - 3);
                review.TotalScore = total;
                review.Rating = total >= 90 ? "Xuất sắc" : total >= 80 ? "Tốt" : total >= 65 ? "Trung bình" : "Cần cải thiện";
                review.AiSummary = $"{employee.FullName} có dữ liệu demo đầy đủ về chấm công, task và kỷ luật trong kỳ.";
                review.AiRecommendation = total >= 80
                    ? "Duy trì hiệu suất, giao thêm nhiệm vụ có độ khó cao hơn."
                    : "Cần theo dõi tiến độ hàng tuần và bổ sung đào tạo kỹ năng.";
                review.ManagerNote = "Dữ liệu seed phục vụ demo Agentic AI.";
                review.Status = i < 3 ? "APPROVED" : "PENDING_APPROVAL";
                review.UpdatedAt = DateTime.Now;
            }

            await _db.SaveChangesAsync();
            return count;
        }
    }
}
