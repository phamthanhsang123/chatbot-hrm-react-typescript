using Admin.Data;
using Admin.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace Admin.Services.Agentic
{
    public class LeaveTool
    {
        private readonly AppDbContext _db;

        public LeaveTool(AppDbContext db)
        {
            _db = db;
        }

        public async Task<AgenticLeaveEvidenceDto> GetLeaveSummaryAsync(
            TargetEmployeeDto employee,
            int month,
            int year)
        {
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1);
            var periodLastDay = periodEnd.AddDays(-1);

            var rows = await (
                from leave in _db.LeaveRequests.AsNoTracking()
                join leaveType in _db.LeaveTypes.AsNoTracking()
                    on leave.LeaveTypeId equals leaveType.Id
                where leave.EmployeeId == employee.Id
                    && leave.StartDate < periodEnd
                    && leave.EndDate >= periodStart
                orderby leave.StartDate
                select new
                {
                    leave.Id,
                    LeaveType = leaveType.Name,
                    leave.StartDate,
                    leave.EndDate,
                    leave.Status
                })
                .ToListAsync();

            var requests = rows.Select(item =>
            {
                var clippedStart = item.StartDate.Date < periodStart ? periodStart : item.StartDate.Date;
                var clippedEnd = item.EndDate.Date > periodLastDay ? periodLastDay : item.EndDate.Date;
                return new AgenticLeaveRequestEvidenceDto
                {
                    LeaveId = item.Id,
                    LeaveType = item.LeaveType,
                    StartDate = item.StartDate.Date,
                    EndDate = item.EndDate.Date,
                    DaysInPeriod = Math.Max(0, (clippedEnd - clippedStart).Days + 1),
                    Status = item.Status
                };
            }).ToList();

            var approved = requests.Where(item => StatusKind(item.Status) == "APPROVED").ToList();
            var pending = requests.Where(item => StatusKind(item.Status) == "PENDING").ToList();
            var rejected = requests.Where(item => StatusKind(item.Status) == "REJECTED").ToList();

            return new AgenticLeaveEvidenceDto
            {
                EmployeeId = employee.Id,
                EmployeeName = employee.FullName,
                DepartmentName = employee.DepartmentName,
                Month = month,
                Year = year,
                TotalRequests = requests.Count,
                ApprovedRequests = approved.Count,
                PendingRequests = pending.Count,
                RejectedRequests = rejected.Count,
                ApprovedDays = approved.Sum(item => item.DaysInPeriod),
                PendingDays = pending.Sum(item => item.DaysInPeriod),
                RejectedDays = rejected.Sum(item => item.DaysInPeriod),
                HasLeaveBalanceData = false,
                Rule = "Số ngày nghỉ được tính theo ngày lịch giao với tháng đang chọn và tách riêng đã duyệt, chờ duyệt, từ chối. CSDL chưa có hạn mức phép năm nên không suy đoán phép còn lại.",
                Requests = requests
            };
        }

        private static string StatusKind(string? status)
        {
            return Normalize(status) switch
            {
                "approved" or "da duyet" => "APPROVED",
                "rejected" or "tu choi" => "REJECTED",
                _ => "PENDING"
            };
        }

        private static string Normalize(string? value)
        {
            var decomposed = (value ?? "")
                .Trim()
                .ToLowerInvariant()
                .Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();
            foreach (var character in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(character == 'đ' ? 'd' : character);
                }
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}
