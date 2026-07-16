using Admin.Data;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class EmployeeService
    {
        private readonly AppDbContext _db;
        private static readonly object DemoLock = new();
        private static readonly List<EmployeeDto> DemoEmployees = new()
        {
            new EmployeeDto { Id = 1, FullName = "Nguyễn Văn A", Email = "nguyenvana@example.com", Phone = "0901000001", Cccd = "001203000001", Role = "EMPLOYEE", Status = "Đang làm việc", DepartmentId = 1, DepartmentName = "IT", PositionId = 1, PositionTitle = "Developer", SalaryBase = 15000000 },
            new EmployeeDto { Id = 2, FullName = "Trần Thị B", Email = "tranthib@example.com", Phone = "0901000002", Cccd = "001203000002", Role = "MANAGER", Status = "Đang làm việc", DepartmentId = 2, DepartmentName = "HR", PositionId = 2, PositionTitle = "HR Manager", SalaryBase = 18000000 },
            new EmployeeDto { Id = 3, FullName = "Lê Văn C", Email = "levanc@example.com", Phone = "0901000003", Cccd = "001203000003", Role = "MANAGER", Status = "Đang làm việc", DepartmentId = 1, DepartmentName = "IT", PositionId = 3, PositionTitle = "Team Lead", SalaryBase = 22000000 },
            new EmployeeDto { Id = 4, FullName = "Phạm Thị D", Email = "phamthid@example.com", Phone = "0901000004", Cccd = "001203000004", Role = "EMPLOYEE", Status = "Đang làm việc", DepartmentId = 3, DepartmentName = "Marketing", PositionId = 4, PositionTitle = "Marketing Executive", SalaryBase = 12000000 },
            new EmployeeDto { Id = 5, FullName = "Đỗ Văn G", Email = "dovang@example.com", Phone = "0901000005", Cccd = "001203000005", Role = "EMPLOYEE", Status = "Đã nghỉ việc", DepartmentId = 2, DepartmentName = "HR", PositionId = 5, PositionTitle = "HR Staff", SalaryBase = 10000000 }
        };

        private static readonly List<object> DemoDepartments = new()
        {
            new { Id = 1, Name = "IT" },
            new { Id = 2, Name = "HR" },
            new { Id = 3, Name = "Marketing" },
            new { Id = 4, Name = "Sales" },
            new { Id = 5, Name = "Accounting" }
        };

        private static readonly List<object> DemoPositions = new()
        {
            new { Id = 1, Title = "Developer", DepartmentId = 1 },
            new { Id = 2, Title = "Team Lead", DepartmentId = 1 },
            new { Id = 3, Title = "QA Tester", DepartmentId = 1 },
            new { Id = 4, Title = "DevOps Engineer", DepartmentId = 1 },
            new { Id = 5, Title = "HR Manager", DepartmentId = 2 },
            new { Id = 6, Title = "HR Staff", DepartmentId = 2 },
            new { Id = 7, Title = "Marketing Manager", DepartmentId = 3 },
            new { Id = 8, Title = "Marketing Executive", DepartmentId = 3 },
            new { Id = 9, Title = "Content Writer", DepartmentId = 3 },
            new { Id = 10, Title = "Sales Manager", DepartmentId = 4 },
            new { Id = 11, Title = "Sales Executive", DepartmentId = 4 },
            new { Id = 12, Title = "Sales Representative", DepartmentId = 4 },
            new { Id = 13, Title = "Chief Accountant", DepartmentId = 5 },
            new { Id = 14, Title = "Accountant", DepartmentId = 5 }
        };

        public EmployeeService(AppDbContext db)
        {
            _db = db;
        }

        // =========================
        // GET ALL (DTO có DepartmentName/PositionTitle)
        // =========================
        public async Task<List<EmployeeDto>> GetAll()
        {
            try
            {
                return await _db.Employees
                    .AsNoTracking()
                    .Select(e => new EmployeeDto
                    {
                        Id = e.Id,
                        Email = e.Email,
                        Role = string.IsNullOrWhiteSpace(e.Role) ? "EMPLOYEE" : e.Role,
                        FullName = e.FullName,
                        Phone = e.Phone,
                        Cccd = e.Cccd,
                        Status = ToApiStatus(e.Status),

                        DepartmentId = e.DepartmentId,
                        DepartmentName = e.Department != null ? e.Department.Name : null,

                        PositionId = e.PositionId,
                        PositionTitle = e.Position != null ? e.Position.Title : null,

                        SalaryBase = e.SalaryBase ?? 0
                    })
                    .ToListAsync();
            }
            catch
            {
                lock (DemoLock)
                {
                    return DemoEmployees.Select(CloneDto).ToList();
                }
            }
        }

        // =========================
        // GET BY ID (DTO)
        // =========================
        public async Task<EmployeeDto?> GetById(int id)
        {
            try
            {
                return await _db.Employees
                    .AsNoTracking()
                    .Where(e => e.Id == id)
                    .Select(e => new EmployeeDto
                    {
                        Id = e.Id,
                        Email = e.Email,
                        Role = string.IsNullOrWhiteSpace(e.Role) ? "EMPLOYEE" : e.Role,
                        FullName = e.FullName,
                        Phone = e.Phone,
                        Cccd = e.Cccd,
                        Status = ToApiStatus(e.Status),

                        DepartmentId = e.DepartmentId,
                        DepartmentName = e.Department != null ? e.Department.Name : null,

                        PositionId = e.PositionId,
                        PositionTitle = e.Position != null ? e.Position.Title : null,

                        SalaryBase = e.SalaryBase ?? 0
                    })
                    .FirstOrDefaultAsync();
            }
            catch
            {
                lock (DemoLock)
                {
                    var employee = DemoEmployees.FirstOrDefault(x => x.Id == id);
                    return employee == null ? null : CloneDto(employee);
                }
            }
        }

        // =========================
        // CREATE
        // =========================
        public async Task<Employee> Create(Employee employee)
        {
            if (string.IsNullOrWhiteSpace(employee.FullName))
                employee.FullName = "EMPLOYEE";

            if (string.IsNullOrWhiteSpace(employee.Status))
                employee.Status = "Đang làm việc";
            employee.Status = ToDbStatus(employee.Status);
            employee.Role = NormalizeRole(employee.Role);
            employee.Password = NormalizePassword(employee.Password);

            try
            {
                var emailExists = await _db.Employees.AnyAsync(e => e.Email == employee.Email);
                if (emailExists)
                    throw new InvalidOperationException("Email này đã tồn tại trong hệ thống.");

                var normalizedCccd = employee.Cccd?.Trim();
                if (!string.IsNullOrWhiteSpace(normalizedCccd))
                {
                    var cccdExists = await _db.Employees.AnyAsync(e => e.Cccd == normalizedCccd);
                    if (cccdExists)
                        throw new InvalidOperationException("CCCD này đã tồn tại trong hệ thống.");
                    employee.Cccd = normalizedCccd;
                }

                await EnsureValidWorkAssignment(employee.DepartmentId, employee.PositionId);

                _db.Employees.Add(employee);
                await _db.SaveChangesAsync();

                return employee;
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                lock (DemoLock)
                {
                    EnsureDemoUnique(employee.Email, employee.Cccd, null);

                    var nextId = DemoEmployees.Count == 0 ? 1 : DemoEmployees.Max(x => x.Id) + 1;
                    var departmentName = GetDemoDepartmentName(employee.DepartmentId);
                    var positionTitle = GetDemoPositionTitle(employee.PositionId);

                    DemoEmployees.Add(new EmployeeDto
                    {
                        Id = nextId,
                        Email = employee.Email,
                        Role = employee.Role,
                        FullName = employee.FullName,
                        Phone = employee.Phone,
                        Cccd = employee.Cccd,
                        Status = employee.Status,
                        DepartmentId = employee.DepartmentId,
                        DepartmentName = departmentName,
                        PositionId = employee.PositionId,
                        PositionTitle = positionTitle,
                        SalaryBase = employee.SalaryBase
                    });

                    employee.Id = nextId;
                    return employee;
                }
            }
        }

        // =========================
        // UPDATE ✅ SỬA: dùng EmployeeUpdateDto (không bắt Password)
        // =========================
        public async Task<bool> Update(int id, EmployeeUpdateDto dto)
        {
            try
            {
                var existing = await _db.Employees.FindAsync(id);
                if (existing == null)
                    return false;

                var emailExists = await _db.Employees.AnyAsync(e => e.Id != id && e.Email == dto.Email);
                if (emailExists)
                    throw new InvalidOperationException("Email này đã tồn tại trong hệ thống.");

                existing.Email = dto.Email;
                existing.Role = NormalizeRole(dto.Role);

                existing.FullName = dto.FullName;
                existing.Phone = dto.Phone;
                var normalizedCccd = dto.Cccd?.Trim();
                if (!string.IsNullOrWhiteSpace(normalizedCccd))
                {
                    var cccdExists = await _db.Employees.AnyAsync(e => e.Id != id && e.Cccd == normalizedCccd);
                    if (cccdExists)
                        throw new InvalidOperationException("CCCD này đã tồn tại trong hệ thống.");
                }

                existing.Cccd = normalizedCccd;

                existing.Status = string.IsNullOrWhiteSpace(dto.Status)
                    ? existing.Status
                    : ToDbStatus(dto.Status);

                await EnsureValidWorkAssignment(dto.DepartmentId, dto.PositionId);

                existing.DepartmentId = dto.DepartmentId;
                existing.PositionId = dto.PositionId;
                existing.SalaryBase = dto.SalaryBase;

                await _db.SaveChangesAsync();
                return true;
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                lock (DemoLock)
                {
                    var existing = DemoEmployees.FirstOrDefault(x => x.Id == id);
                    if (existing == null)
                        return false;

                    EnsureDemoUnique(dto.Email, dto.Cccd, id);

                    existing.Email = dto.Email;
                    existing.Role = NormalizeRole(dto.Role);
                    existing.FullName = dto.FullName;
                    existing.Phone = dto.Phone;
                    existing.Cccd = dto.Cccd;
                    existing.Status = string.IsNullOrWhiteSpace(dto.Status) ? existing.Status : dto.Status;
                    existing.DepartmentId = dto.DepartmentId;
                    existing.DepartmentName = GetDemoDepartmentName(dto.DepartmentId);
                    existing.PositionId = dto.PositionId;
                    existing.PositionTitle = GetDemoPositionTitle(dto.PositionId);
                    existing.SalaryBase = dto.SalaryBase;

                    return true;
                }
            }
        }

        // =========================
        // DELETE (SOFT DELETE)
        // =========================
        public async Task<bool> Delete(int id)
        {
            try
            {
                var emp = await _db.Employees.FindAsync(id);
                if (emp == null)
                    return false;

                emp.Status = ToDbStatus("Đã nghỉ việc");
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                lock (DemoLock)
                {
                    var emp = DemoEmployees.FirstOrDefault(x => x.Id == id);
                    if (emp == null)
                        return false;

                    emp.Status = "Đã nghỉ việc";
                    return true;
                }
            }
        }

        // =========================
        // LIST DEPARTMENTS (CHO DROPDOWN FE)
        // =========================
        public async Task<List<object>> GetDepartments()
        {
            try
            {
                return await _db.Departments
                    .AsNoTracking()
                    .Select(d => new { d.Id, d.Name })
                    .Cast<object>()
                    .ToListAsync();
            }
            catch
            {
                return DemoDepartments.ToList();
            }
        }

        // =========================
        // LIST POSITIONS (CHO DROPDOWN FE)
        // =========================
        public async Task<List<object>> GetPositions()
        {
            try
            {
                return await _db.Positions
                    .AsNoTracking()
                    .Select(p => new { p.Id, p.Title, p.DepartmentId })
                    .Cast<object>()
                    .ToListAsync();
            }
            catch
            {
                return DemoPositions.ToList();
            }
        }

        private static EmployeeDto CloneDto(EmployeeDto employee)
        {
            return new EmployeeDto
            {
                Id = employee.Id,
                Email = employee.Email,
                Role = employee.Role,
                FullName = employee.FullName,
                Phone = employee.Phone,
                Cccd = employee.Cccd,
                Status = employee.Status,
                DepartmentId = employee.DepartmentId,
                DepartmentName = employee.DepartmentName,
                PositionId = employee.PositionId,
                PositionTitle = employee.PositionTitle,
                SalaryBase = employee.SalaryBase
            };
        }

        private static void EnsureDemoUnique(string email, string? cccd, int? currentId)
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();
            var normalizedCccd = cccd?.Trim();

            if (DemoEmployees.Any(x => x.Id != currentId && x.Email.Trim().ToLowerInvariant() == normalizedEmail))
            {
                throw new InvalidOperationException("Email này đã tồn tại trong hệ thống.");
            }

            if (!string.IsNullOrWhiteSpace(normalizedCccd) &&
                DemoEmployees.Any(x => x.Id != currentId && x.Cccd?.Trim() == normalizedCccd))
            {
                throw new InvalidOperationException("CCCD này đã tồn tại trong hệ thống.");
            }
        }

        private static string? GetDemoDepartmentName(int? id)
        {
            return id switch
            {
                1 => "IT",
                2 => "HR",
                3 => "Marketing",
                4 => "Sales",
                5 => "Accounting",
                _ => null
            };
        }

        private static string? GetDemoPositionTitle(int? id)
        {
            return id switch
            {
                1 => "Developer",
                2 => "HR Manager",
                3 => "Team Lead",
                4 => "Marketing Executive",
                5 => "HR Staff",
                6 => "QA Tester",
                7 => "DevOps Engineer",
                8 => "Marketing Manager",
                9 => "Content Writer",
                10 => "Sales Manager",
                11 => "Sales Executive",
                12 => "Sales Representative",
                13 => "Chief Accountant",
                14 => "Accountant",
                _ => null
            };
        }

        private async Task EnsureValidWorkAssignment(int? departmentId, int? positionId)
        {
            if (departmentId.HasValue)
            {
                var departmentExists = await _db.Departments.AnyAsync(d => d.Id == departmentId.Value);
                if (!departmentExists)
                    throw new InvalidOperationException("Phòng ban không tồn tại trong hệ thống.");
            }

            if (!positionId.HasValue)
                return;

            var position = await _db.Positions
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == positionId.Value);

            if (position == null)
                throw new InvalidOperationException("Chức vụ không tồn tại trong hệ thống.");

            if (position.DepartmentId.HasValue &&
                departmentId.HasValue &&
                position.DepartmentId.Value != departmentId.Value)
            {
                throw new InvalidOperationException("Chức vụ không thuộc phòng ban đã chọn.");
            }
        }

        private static string ToApiStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "Đang làm việc";

            return status.Trim().ToLowerInvariant() switch
            {
                "active" => "Đang làm việc",
                "inactive" => "Đã nghỉ việc",
                "đã nghỉ việc" => "Đã nghỉ việc",
                "da nghi viec" => "Đã nghỉ việc",
                _ => status
            };
        }

        private static string ToDbStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "active";

            return status.Trim().ToLowerInvariant() switch
            {
                "đang làm việc" => "active",
                "dang lam viec" => "active",
                "active" => "active",
                "đã nghỉ việc" => "inactive",
                "da nghi viec" => "inactive",
                "inactive" => "inactive",
                _ => status
            };
        }

        private static string NormalizeRole(string? role)
        {
            if (string.IsNullOrWhiteSpace(role)) return "EMPLOYEE";

            return role.Trim().ToUpperInvariant() switch
            {
                "ADMIN" => "ADMIN",
                "HR" => "ADMIN",
                "QUẢN TRỊ" => "ADMIN",
                "QUAN TRI" => "ADMIN",
                "MANAGER" => "MANAGER",
                "QUẢN LÝ" => "MANAGER",
                "QUAN LY" => "MANAGER",
                _ => "EMPLOYEE"
            };
        }

        private static string NormalizePassword(string? password)
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                return BCrypt.Net.BCrypt.HashPassword("123456");
            }

            if (password.StartsWith("$2a$") || password.StartsWith("$2b$") || password.StartsWith("$2y$"))
            {
                return password;
            }

            return BCrypt.Net.BCrypt.HashPassword(password);
        }
    }
}
