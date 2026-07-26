using Admin.Data;
using Admin.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services.Agentic
{
    public class AgenticHrmTool
    {
        private readonly AppDbContext _db;
        private readonly AgenticCompetencyService _competencyService;

        public AgenticHrmTool(AppDbContext db, AgenticCompetencyService competencyService)
        {
            _db = db;
            _competencyService = competencyService;
        }

        public async Task<List<TargetEmployeeDto>> GetTargetEmployeesAsync(AgenticAiRunRequestDto request)
        {
            var manager = await _db.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == request.ManagerId);

            if (manager == null)
                throw new InvalidOperationException("Manager not found.");

            if (!IsManager(manager.Role) && !IsAdmin(manager.Role))
                throw new InvalidOperationException("Only manager or admin can run Agentic AI analysis.");

            var query = _db.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .AsNoTracking()
                .Where(e => e.Status != "inactive"
                    && e.Status != "da nghi viec"
                    && e.Status != "Đã nghỉ việc");

            if (!IsAdmin(manager.Role))
            {
                query = query.Where(e =>
                    e.DepartmentId == manager.DepartmentId
                    && e.Id != manager.Id
                    && e.Role != "MANAGER"
                    && e.Role != "ADMIN");
            }
            else
            {
                query = query.Where(e => e.Id != manager.Id && e.Role != "ADMIN");
            }

            if (request.DepartmentId.HasValue)
            {
                query = query.Where(e => e.DepartmentId == request.DepartmentId.Value);
            }

            if (request.EmployeeId.HasValue)
            {
                query = query.Where(e => e.Id == request.EmployeeId.Value);
            }

            var employees = await query
                .OrderBy(e => e.FullName)
                .Select(e => new TargetEmployeeDto
                {
                    Id = e.Id,
                    FullName = e.FullName,
                    Email = e.Email,
                    Role = e.Role,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : null,
                    PositionId = e.PositionId,
                    PositionTitle = e.Position != null ? e.Position.Title : null,
                    SalaryBase = e.SalaryBase,
                    Status = e.Status
                })
                .ToListAsync();

            if (request.EmployeeId.HasValue && employees.Count == 0)
            {
                throw new InvalidOperationException(
                    "Nhân viên không tồn tại, đã nghỉ việc hoặc nằm ngoài phạm vi quản lý.");
            }

            return employees;
        }

        public async Task<(List<CompetencyInputDataDto> Inputs, List<string> MissingData)> GetCompetencyInputsAsync(
            AgenticAiRunRequestDto request,
            List<TargetEmployeeDto> employees)
        {
            var inputs = new List<CompetencyInputDataDto>();
            var missing = new List<string>();

            foreach (var employee in employees)
            {
                try
                {
                    var input = await _competencyService.GetInputData(
                        request.ManagerId,
                        employee.Id,
                        request.Month,
                        request.Year
                    );

                    inputs.Add(input);

                    if (input.TotalTasks == 0)
                        missing.Add($"{employee.FullName}: không có dữ liệu task trong kỳ đã chọn.");

                    if (input.AttendanceDays == 0)
                        missing.Add($"{employee.FullName}: không có dữ liệu chấm công trong kỳ đã chọn.");
                }
                catch (Exception ex)
                {
                    missing.Add($"{employee.FullName}: không thu thập được dữ liệu năng lực - {ex.Message}");
                }
            }

            return (inputs, missing);
        }

        private static bool IsManager(string? role)
        {
            return string.Equals(role, "MANAGER", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsAdmin(string? role)
        {
            return string.Equals(role, "ADMIN", StringComparison.OrdinalIgnoreCase);
        }
    }
}
