using Admin.Data;
using Admin.DTOs;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class SalaryService
    {
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
            var list = _context.Payrolls
                .Where(x => x.Month == month && x.Year == year)
                .ToList();

            return new
            {
                totalNet = list.Sum(x => x.TotalSalary),
                avgNet = list.Count > 0 ? list.Average(x => x.TotalSalary) : 0,
                totalBonus = list.Sum(x => x.Bonus),
                pending = list.Count(x => x.Status != "Đã thanh toán"),
                count = list.Count
            };
        }

        // =========================
        // GET ALL SALARY
        // =========================
        public List<SalaryRowDto> GetAll(int month, int year, string? status)
        {
            var query =
                from p in _context.Payrolls
                join e in _context.Employees on p.EmployeeId equals e.Id
                join d in _context.Departments on e.DepartmentId equals d.Id
                join pos in _context.Positions on e.PositionId equals pos.Id
                where p.Month == month && p.Year == year
                select new SalaryRowDto
                {
                    Id = p.Id,

                    EmployeeId = e.Id,
                    EmployeeCode = "NV" + e.Id.ToString("D3"),
                    EmployeeName = e.FullName,

                    Department = d.Name,
                    Position = pos.Title,

                    SalaryBase = p.SalaryBase,
                    Bonus = p.Bonus,

                    TotalIncome = p.TotalSalary,
                    NetPay = p.TotalSalary - p.Deductions,

                    Status = p.Status
                };

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(x => x.Status == status);
            }

            return query.ToList();
        }

        public List<SalaryRowDto> GetByEmployee(int employeeId, int month, int year)
        {
            var query =
                from e in _context.Employees
                join d in _context.Departments on e.DepartmentId equals d.Id into departmentJoin
                from d in departmentJoin.DefaultIfEmpty()
                join pos in _context.Positions on e.PositionId equals pos.Id into positionJoin
                from pos in positionJoin.DefaultIfEmpty()
                join p in _context.Payrolls.Where(x => x.Month == month && x.Year == year)
                    on e.Id equals p.EmployeeId into payrollJoin
                from p in payrollJoin.DefaultIfEmpty()
                where e.Id == employeeId
                select new SalaryRowDto
                {
                    Id = p != null ? p.Id : 0,
                    EmployeeId = e.Id,
                    EmployeeCode = "NV" + e.Id.ToString("D3"),
                    EmployeeName = e.FullName,
                    Department = d != null ? d.Name : "Chưa phân phòng",
                    Position = pos != null ? pos.Title : "Nhân viên",
                    SalaryBase = p != null ? p.SalaryBase : (e.SalaryBase ?? 0),
                    Bonus = p != null ? p.Bonus : 0,
                    TotalIncome = p != null ? p.TotalSalary : (e.SalaryBase ?? 0),
                    NetPay = p != null ? p.TotalSalary - p.Deductions : (e.SalaryBase ?? 0),
                    Status = p != null ? p.Status : "Chờ duyệt"
                };

            return query.ToList();
        }

        // =========================
        // CALCULATE SALARY
        // =========================
        public int CalculateMonthly(int month, int year)
        {
            var employees = _context.Employees.ToList();
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
