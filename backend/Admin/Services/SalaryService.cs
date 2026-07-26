using Admin.Data;
using Admin.DTOs;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class SalaryService
    {
        private const int StandardDays = 22;
        private readonly AppDbContext _context;

        public SalaryService(AppDbContext context)
        {
            _context = context;
        }

        // =========================
        // DASHBOARD
        // =========================
        public object Dashboard(int month, int year)
        {
            var list = GetAll(month, year, null);

            return new
            {
                totalGross = list.Sum(x => x.TotalIncome),
                totalNet = list.Sum(x => x.NetPay),
                avgNet = list.Count > 0 ? list.Average(x => x.NetPay) : 0,
                totalBonus = list.Sum(x => x.Bonus),
                totalDeduction = list.Sum(x => x.TotalDeduction),
                pending = list.Count(x => x.Status != "Đã thanh toán"),
                count = list.Count
            };
        }

        // =========================
        // GET ALL SALARY
        // =========================
        public List<SalaryRowDto> GetAll(int month, int year, string? status)
        {
            var query = BuildSalaryQuery(month, year);

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                query = query.Where(x => x.Status == status);
            }

            return EnrichAttendance(query.ToList(), month, year);
        }

        public List<SalaryRowDto> GetByEmployee(int employeeId, int month, int year)
        {
            var rows = BuildSalaryQuery(month, year)
                .Where(x => x.EmployeeId == employeeId)
                .ToList();

            return EnrichAttendance(rows, month, year);
        }

        public List<SalaryRowDto> GetByManager(int managerId, int month, int year, string? status)
        {
            var manager = _context.Employees
                .AsNoTracking()
                .FirstOrDefault(x => x.Id == managerId);

            if (manager == null)
            {
                return new List<SalaryRowDto>();
            }

            var query = BuildSalaryQuery(month, year);

            if (!string.Equals(manager.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                if (!manager.DepartmentId.HasValue)
                {
                    return new List<SalaryRowDto>();
                }

                var departmentName = _context.Departments
                    .AsNoTracking()
                    .Where(x => x.Id == manager.DepartmentId.Value)
                    .Select(x => x.Name)
                    .FirstOrDefault();

                query = query.Where(x => x.Department == departmentName);
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                query = query.Where(x => x.Status == status);
            }

            return EnrichAttendance(query.ToList(), month, year);
        }

        private IQueryable<SalaryRowDto> BuildSalaryQuery(int month, int year)
        {
            return
                from p in _context.Payrolls
                join e in _context.Employees on p.EmployeeId equals e.Id
                join d in _context.Departments on e.DepartmentId equals d.Id into departments
                from d in departments.DefaultIfEmpty()
                join pos in _context.Positions on e.PositionId equals pos.Id into positions
                from pos in positions.DefaultIfEmpty()
                where p.Month == month && p.Year == year
                select new SalaryRowDto
                {
                    Id = p.Id,

                    EmployeeId = e.Id,
                    EmployeeCode = "NV" + e.Id.ToString("D3"),
                    EmployeeName = e.FullName,

                    Department = d != null ? d.Name : "Chưa phân phòng",
                    Position = pos != null ? pos.Title : "Chưa có chức vụ",

                    SalaryBase = p.SalaryBase,
                    Bonus = p.Bonus,

                    TotalIncome = p.TotalSalary,
                    TotalDeduction = p.Deductions,
                    NetPay = p.TotalSalary - p.Deductions,

                    Status = p.Status
                };
        }

        // =========================
        // CALCULATE SALARY
        // =========================
        public int CalculateMonthly(int month, int year)
        {
            var employees = _context.Employees
                .Where(x => x.Status != "Đã nghỉ việc" && x.Status != "inactive")
                .ToList();
            int count = 0;

            foreach (var e in employees)
            {
                var exists = _context.Payrolls
                    .FirstOrDefault(x =>
                        x.EmployeeId == e.Id &&
                        x.Month == month &&
                        x.Year == year);

                if (exists != null) continue;

                var salary = new Payroll
                {
                    EmployeeId = e.Id,
                    Month = month,
                    Year = year,
                    SalaryBase = e.SalaryBase ?? 0,
                    Bonus = 0,
                    Deductions = 0,
                    TotalSalary = e.SalaryBase ?? 0,
                    Status = "Chờ duyệt"
                };

                _context.Payrolls.Add(salary);
                count++;
            }

            _context.SaveChanges();
            return count;
        }

        private List<SalaryRowDto> EnrichAttendance(List<SalaryRowDto> rows, int month, int year)
        {
            if (rows.Count == 0)
            {
                return rows;
            }

            var employeeIds = rows.Select(x => x.EmployeeId).ToList();
            var attendance = _context.Attendances
                .AsNoTracking()
                .Where(x =>
                    employeeIds.Contains(x.EmployeeId) &&
                    x.Date.Year == year &&
                    x.Date.Month == month)
                .ToList()
                .GroupBy(x => x.EmployeeId)
                .ToDictionary(x => x.Key, x => x.ToList());

            foreach (var row in rows)
            {
                if (!attendance.TryGetValue(row.EmployeeId, out var records))
                {
                    continue;
                }

                row.WorkDays = records.Count(x => x.CheckInTime.HasValue);
                row.LateDays = records.Count(x =>
                    x.CheckInTime.HasValue &&
                    x.CheckInTime.Value > new TimeSpan(8, 30, 0));
                row.EarlyLeaveDays = records.Count(x =>
                    x.CheckOutTime.HasValue &&
                    x.CheckOutTime.Value < new TimeSpan(17, 0, 0));
                row.OvertimeHours = records.Sum(CalculateOvertimeHours);
            }

            return rows;
        }

        private static decimal CalculateOvertimeHours(Attendance attendance)
        {
            if (!attendance.CheckInTime.HasValue || !attendance.CheckOutTime.HasValue)
            {
                return 0;
            }

            var duration = attendance.CheckOutTime.Value - attendance.CheckInTime.Value;
            return Math.Max(0, (decimal)duration.TotalHours - 9);
        }

        // =========================
        // APPROVE
        // =========================
        public bool Approve(int id)
        {
            var salary = _context.Payrolls.FirstOrDefault(x => x.Id == id);

            if (salary == null) return false;

            if (salary.Status != "Chờ duyệt")
                return false;

            salary.Status = "Chờ thanh toán";

            _context.SaveChanges();
            return true;
        }

        // =========================
        // PAY
        // =========================
        public bool Pay(int id)
        {
            var salary = _context.Payrolls.FirstOrDefault(x => x.Id == id);

            if (salary == null) return false;

            if (salary.Status != "Chờ thanh toán")
                return false;

            salary.Status = "Đã thanh toán";

            _context.SaveChanges();
            return true;
        }
    }
}
