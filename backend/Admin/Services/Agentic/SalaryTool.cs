using Admin.Data;
using Admin.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace Admin.Services.Agentic
{
    public class SalaryTool
    {
        private readonly AppDbContext _db;

        public SalaryTool(AppDbContext db)
        {
            _db = db;
        }

        public async Task<AgenticSalaryEvidenceDto> GetSalaryHistoryAsync(
            TargetEmployeeDto employee,
            int? month = null,
            int? year = null)
        {
            var query = _db.Payrolls
                .AsNoTracking()
                .Where(item => item.EmployeeId == employee.Id);

            if (month.HasValue && year.HasValue)
            {
                query = query.Where(item => item.Month == month.Value && item.Year == year.Value);
            }

            var rows = await query
                .OrderBy(item => item.Year)
                .ThenBy(item => item.Month)
                .Select(item => new
                {
                    item.Id,
                    item.Month,
                    item.Year,
                    item.TotalSalary,
                    item.Deductions,
                    item.Status
                })
                .ToListAsync();

            var periods = rows.Select(item =>
            {
                var isPaid = Normalize(item.Status) == "da thanh toan";
                return new AgenticSalaryPeriodEvidenceDto
                {
                    PayrollId = item.Id,
                    Month = item.Month,
                    Year = item.Year,
                    GrossSalary = item.TotalSalary,
                    Deductions = item.Deductions,
                    NetSalary = item.TotalSalary - item.Deductions,
                    Status = item.Status,
                    IsPaid = isPaid
                };
            }).ToList();

            return new AgenticSalaryEvidenceDto
            {
                EmployeeId = employee.Id,
                EmployeeName = employee.FullName,
                DepartmentName = employee.DepartmentName,
                TotalPeriods = periods.Count,
                PaidPeriods = periods.Count(item => item.IsPaid),
                PendingPeriods = periods.Count(item => !item.IsPaid),
                RecordedNetSalary = periods.Sum(item => item.NetSalary),
                PaidNetSalary = periods.Where(item => item.IsPaid).Sum(item => item.NetSalary),
                PendingNetSalary = periods.Where(item => !item.IsPaid).Sum(item => item.NetSalary),
                Rule = "Lương thực nhận = tổng thu nhập - khấu trừ; chỉ kỳ 'Đã thanh toán' được tính là đã nhận.",
                Periods = periods
            };
        }

        private static string Normalize(string value)
        {
            var decomposed = (value ?? "").Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();
            foreach (var character in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                    builder.Append(character == 'đ' ? 'd' : character);
            }
            return builder.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}
