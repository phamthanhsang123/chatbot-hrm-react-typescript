using Admin.Data;
using Admin.DTOs;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class SalaryService
    {
        private const int StandardDays = 22;
        private const decimal OvertimeRate = 1.5m;
        private readonly AppDbContext _context;

        public SalaryService(AppDbContext context)
        {
            _context = context;
        }

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

        public List<SalaryRowDto> GetAll(int month, int year, string? status)
        {
            var employees = LoadEmployeesQuery().ToList();
            var rows = employees.Select(e => BuildSalaryRow(e, month, year)).ToList();

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                rows = rows.Where(x => x.Status == status).ToList();
            }

            return rows;
        }

        public List<SalaryRowDto> GetByManager(int managerId, int month, int year, string? status)
        {
            var manager = _context.Employees.AsNoTracking().FirstOrDefault(e => e.Id == managerId);
            if (manager == null) return new List<SalaryRowDto>();

            var employees = LoadEmployeesQuery()
                .Where(e => manager.Role == "ADMIN" || e.DepartmentId == manager.DepartmentId)
                .ToList();

            var rows = employees.Select(e => BuildSalaryRow(e, month, year)).ToList();

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                rows = rows.Where(x => x.Status == status).ToList();
            }

            return rows;
        }

        public List<SalaryRowDto> GetByEmployee(int employeeId, int month, int year)
        {
            var employee = LoadEmployeesQuery().FirstOrDefault(e => e.Id == employeeId);
            return employee == null
                ? new List<SalaryRowDto>()
                : new List<SalaryRowDto> { BuildSalaryRow(employee, month, year) };
        }

        public int CalculateMonthly(int month, int year)
        {
            var employees = _context.Employees
                .Where(e => e.Status != "Đã nghỉ việc")
                .ToList();

            var count = 0;

            foreach (var employee in employees)
            {
                var row = BuildSalaryRow(employee, month, year);
                var payroll = _context.Payrolls.FirstOrDefault(x =>
                    x.EmployeeId == employee.Id &&
                    x.Month == month &&
                    x.Year == year);

                if (payroll == null)
                {
                    payroll = new Payroll
                    {
                        EmployeeId = employee.Id,
                        Month = month,
                        Year = year,
                        Status = "Chờ duyệt"
                    };
                    _context.Payrolls.Add(payroll);
                    count++;
                }

                payroll.SalaryBase = row.SalaryBase;
                payroll.Bonus = row.Bonus + row.Allowance + row.OvertimePay;
                payroll.Deductions = row.TotalDeduction;
                payroll.TotalSalary = row.TotalIncome;
            }

            _context.SaveChanges();
            return count;
        }

        public bool Approve(int id)
        {
            var salary = _context.Payrolls.FirstOrDefault(x => x.Id == id);
            if (salary == null || salary.Status != "Chờ duyệt") return false;

            salary.Status = "Chờ thanh toán";
            _context.SaveChanges();
            return true;
        }

        public bool Pay(int id)
        {
            var salary = _context.Payrolls.FirstOrDefault(x => x.Id == id);
            if (salary == null || salary.Status != "Chờ thanh toán") return false;

            salary.Status = "Đã thanh toán";
            _context.SaveChanges();
            return true;
        }

        private IQueryable<Employee> LoadEmployeesQuery()
        {
            return _context.Employees
                .AsNoTracking()
                .Include(e => e.Department)
                .Include(e => e.Position)
                .Where(e => e.Status != "Đã nghỉ việc");
        }

        private SalaryRowDto BuildSalaryRow(Employee employee, int month, int year)
        {
            var baseSalary = employee.SalaryBase ?? 0;
            var payroll = _context.Payrolls.AsNoTracking().FirstOrDefault(x =>
                x.EmployeeId == employee.Id &&
                x.Month == month &&
                x.Year == year);

            var attendance = _context.Attendances.AsNoTracking()
                .Where(x => x.EmployeeId == employee.Id && x.Date.Month == month && x.Date.Year == year)
                .ToList();

            var leaveRequests = _context.LeaveRequests.AsNoTracking()
                .Where(x => x.EmployeeId == employee.Id && x.Status == "Đã duyệt" && x.StartDate.Month <= month && x.EndDate.Month >= month && x.StartDate.Year == year)
                .ToList();

            var tasks = _context.Tasks.AsNoTracking()
                .Where(x => x.EmployeeId == employee.Id && x.Deadline.Month == month && x.Deadline.Year == year)
                .ToList();

            var workDays = attendance.Count(x => x.CheckInTime.HasValue);
            var paidLeaveDays = leaveRequests.Where(x => x.LeaveTypeId != 3).Sum(x => x.TotalDays);
            var unpaidLeaveDays = leaveRequests.Where(x => x.LeaveTypeId == 3).Sum(x => x.TotalDays);
            var absentDays = Math.Max(0, StandardDays - workDays - paidLeaveDays - unpaidLeaveDays);
            var lateDays = attendance.Count(x => x.CheckInTime.HasValue && x.CheckInTime.Value.TimeOfDay > new TimeSpan(8, 30, 0));
            var earlyLeaveDays = attendance.Count(x => x.CheckOutTime.HasValue && x.CheckOutTime.Value.TimeOfDay < new TimeSpan(17, 0, 0));
            var overtimeHours = attendance.Sum(GetOvertimeHours);

            var role = employee.Role?.ToUpperInvariant() ?? "EMPLOYEE";
            var dailySalary = StandardDays > 0 ? baseSalary / StandardDays : 0;
            var hourlySalary = dailySalary / 8;
            var mealAllowance = workDays * 35000m;
            var transportAllowance = 500000m;
            var phoneAllowance = role == "ADMIN" || role == "MANAGER" ? 500000m : 200000m;
            var responsibilityAllowance = role == "ADMIN" ? 2000000m : role == "MANAGER" ? 1500000m : 0m;
            var allowance = mealAllowance + transportAllowance + phoneAllowance + responsibilityAllowance;

            var overtimePay = Math.Round(hourlySalary * overtimeHours * OvertimeRate, 0);
            var approvedTaskBonus = tasks.Count(x => x.Status == "APPROVED") * 300000m;
            var progressBonus = tasks.Count == 0 ? 0 : Math.Round((decimal)tasks.Average(x => x.ProgressPercent) * 10000m, 0);
            var roleBonus = role == "ADMIN" ? 1500000m : role == "MANAGER" ? 1000000m : 500000m;
            var bonus = Math.Min(4000000m, roleBonus + approvedTaskBonus + progressBonus);

            var salaryDeduction = Math.Round((unpaidLeaveDays + absentDays) * dailySalary, 0);
            var insuranceDeduction = Math.Round(baseSalary * 0.105m, 0);
            var penaltyDeduction = (lateDays + earlyLeaveDays) * 100000m;
            var grossBeforeTax = baseSalary + allowance + overtimePay + bonus;
            var taxableIncome = Math.Max(0, grossBeforeTax - insuranceDeduction - 11000000m);
            var taxDeduction = CalculatePersonalIncomeTax(taxableIncome);
            var totalDeduction = salaryDeduction + insuranceDeduction + penaltyDeduction + taxDeduction;
            var netPay = Math.Max(0, grossBeforeTax - totalDeduction);

            return new SalaryRowDto
            {
                Id = payroll?.Id ?? 0,
                EmployeeId = employee.Id,
                EmployeeCode = "NV" + employee.Id.ToString("D3"),
                EmployeeName = employee.FullName,
                Department = employee.Department?.Name ?? "Chưa phân phòng",
                Position = employee.Position?.Title ?? "Nhân viên",
                SalaryBase = baseSalary,
                Bonus = bonus,
                Allowance = allowance,
                OvertimePay = overtimePay,
                SalaryDeduction = salaryDeduction,
                InsuranceDeduction = insuranceDeduction,
                TaxDeduction = taxDeduction,
                PenaltyDeduction = penaltyDeduction,
                TotalIncome = grossBeforeTax,
                TotalDeduction = totalDeduction,
                NetPay = netPay,
                StandardDays = StandardDays,
                WorkDays = workDays,
                PaidLeaveDays = paidLeaveDays,
                UnpaidLeaveDays = unpaidLeaveDays,
                LateDays = lateDays,
                EarlyLeaveDays = earlyLeaveDays,
                OvertimeHours = overtimeHours,
                Status = payroll?.Status ?? "Chờ duyệt"
            };
        }

        private static decimal GetOvertimeHours(Attendance attendance)
        {
            if (!attendance.CheckInTime.HasValue || !attendance.CheckOutTime.HasValue) return 0;

            var hours = (decimal)(attendance.CheckOutTime.Value - attendance.CheckInTime.Value).TotalHours;
            return Math.Max(0m, hours - 8m);
        }

        private static decimal CalculatePersonalIncomeTax(decimal taxableIncome)
        {
            if (taxableIncome <= 0) return 0;
            if (taxableIncome <= 5000000m) return Math.Round(taxableIncome * 0.05m, 0);
            if (taxableIncome <= 10000000m) return Math.Round(250000m + (taxableIncome - 5000000m) * 0.10m, 0);
            if (taxableIncome <= 18000000m) return Math.Round(750000m + (taxableIncome - 10000000m) * 0.15m, 0);
            return Math.Round(1950000m + (taxableIncome - 18000000m) * 0.20m, 0);
        }
    }
}
