using Admin.Data;
using Admin.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services.Agentic
{
    public class AttendanceTool
    {
        private static readonly TimeSpan DefaultLateAfter = new(8, 30, 0);
        private static readonly TimeSpan ShiftGracePeriod = TimeSpan.FromMinutes(30);
        private readonly AppDbContext _db;

        public AttendanceTool(AppDbContext db)
        {
            _db = db;
        }

        public async Task<AgenticAttendanceEvidenceDto> GetLateDaysAsync(
            TargetEmployeeDto employee,
            int month,
            int year)
        {
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1);

            var rows = await _db.Attendances
                .AsNoTracking()
                .Where(item =>
                    item.EmployeeId == employee.Id
                    && item.Date >= periodStart
                    && item.Date < periodEnd
                    && item.CheckInTime.HasValue)
                .OrderBy(item => item.Date)
                .Select(item => new
                {
                    item.Date,
                    CheckIn = item.CheckInTime!.Value
                })
                .ToListAsync();

            var shiftStarts = await _db.AttendanceShifts
                .AsNoTracking()
                .Where(item =>
                    item.EmployeeId == employee.Id
                    && item.WorkDate >= periodStart
                    && item.WorkDate < periodEnd
                    && item.Status != "CANCELLED")
                .GroupBy(item => item.WorkDate.Date)
                .Select(group => new
                {
                    Date = group.Key,
                    StartTime = group.Min(item => item.StartTime)
                })
                .ToDictionaryAsync(item => item.Date, item => item.StartTime);

            var lateRows = rows
                .Select(item =>
                {
                    var expectedStart = shiftStarts.GetValueOrDefault(item.Date.Date);
                    var lateAfter = expectedStart == default
                        ? DefaultLateAfter
                        : expectedStart.Add(ShiftGracePeriod);
                    return new
                    {
                        item.Date,
                        item.CheckIn,
                        ExpectedStart = expectedStart == default
                            ? DefaultLateAfter.Subtract(ShiftGracePeriod)
                            : expectedStart,
                        LateAfter = lateAfter
                    };
                })
                .Where(item => item.CheckIn > item.LateAfter)
                .Select(item => new AgenticAttendanceDayEvidenceDto
                {
                    Date = item.Date.Date,
                    CheckInTime = item.CheckIn.ToString(@"hh\:mm"),
                    ExpectedStartTime = item.ExpectedStart.ToString(@"hh\:mm"),
                    LateMinutes = Math.Max(0, (int)Math.Round((item.CheckIn - item.LateAfter).TotalMinutes))
                })
                .ToList();

            return new AgenticAttendanceEvidenceDto
            {
                EmployeeId = employee.Id,
                EmployeeName = employee.FullName,
                DepartmentName = employee.DepartmentName,
                Month = month,
                Year = year,
                Rule = "Đi trễ khi check-in sau giờ bắt đầu ca 30 phút; nếu chưa có lịch ca thì dùng mốc 08:30.",
                AttendanceDays = rows.Count,
                LateDays = lateRows.Count,
                LateDates = lateRows
            };
        }

        public async Task<AgenticWorkHoursEvidenceDto> GetWorkHoursSummaryAsync(
            TargetEmployeeDto employee,
            int month,
            int year)
        {
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1);

            var rows = await _db.Attendances
                .AsNoTracking()
                .Where(item =>
                    item.EmployeeId == employee.Id
                    && item.Date >= periodStart
                    && item.Date < periodEnd)
                .OrderBy(item => item.Date)
                .Select(item => new
                {
                    item.Date,
                    item.CheckInTime,
                    item.CheckOutTime
                })
                .ToListAsync();

            var shifts = await _db.AttendanceShifts
                .AsNoTracking()
                .Where(item =>
                    item.EmployeeId == employee.Id
                    && item.WorkDate >= periodStart
                    && item.WorkDate < periodEnd
                    && item.Status != "CANCELLED")
                .GroupBy(item => item.WorkDate.Date)
                .Select(group => new
                {
                    Date = group.Key,
                    StartTime = group.Min(item => item.StartTime),
                    EndTime = group.Max(item => item.EndTime)
                })
                .ToDictionaryAsync(item => item.Date);

            var days = rows.Select(item =>
            {
                shifts.TryGetValue(item.Date.Date, out var shift);
                var expectedStart = shift?.StartTime ?? TimeSpan.FromHours(8);
                var expectedEnd = shift?.EndTime ?? new TimeSpan(17, 30, 0);
                var workedHours = CalculateWorkedHours(item.CheckInTime, item.CheckOutTime);

                return new AgenticWorkHoursDayEvidenceDto
                {
                    Date = item.Date.Date,
                    CheckInTime = item.CheckInTime?.ToString(@"hh\:mm"),
                    CheckOutTime = item.CheckOutTime?.ToString(@"hh\:mm"),
                    WorkedHours = workedHours,
                    OvertimeHours = Math.Max(0, workedHours - 8m),
                    IsLate = item.CheckInTime.HasValue
                        && item.CheckInTime.Value > expectedStart.Add(ShiftGracePeriod),
                    IsEarlyLeave = item.CheckOutTime.HasValue
                        && item.CheckOutTime.Value < expectedEnd,
                    IsIncomplete = !item.CheckInTime.HasValue || !item.CheckOutTime.HasValue
                };
            }).ToList();

            var completedDays = days.Count(item => !item.IsIncomplete);
            var totalWorkedHours = days.Sum(item => item.WorkedHours);
            return new AgenticWorkHoursEvidenceDto
            {
                EmployeeId = employee.Id,
                EmployeeName = employee.FullName,
                DepartmentName = employee.DepartmentName,
                Month = month,
                Year = year,
                AttendanceDays = days.Count,
                CompletedDays = completedDays,
                IncompleteDays = days.Count(item => item.IsIncomplete),
                LateDays = days.Count(item => item.IsLate),
                EarlyLeaveDays = days.Count(item => item.IsEarlyLeave),
                TotalWorkedHours = totalWorkedHours,
                AverageWorkedHours = completedDays == 0
                    ? 0
                    : Math.Round(totalWorkedHours / completedDays, 2),
                ExpectedHours = completedDays * 8m,
                OvertimeHours = days.Sum(item => item.OvertimeHours),
                Rule = "Giờ công = check-out - check-in, trừ phần giao với 12:00-13:00; tăng ca là phần vượt 8 giờ/ngày; thiếu công khi thiếu check-in hoặc check-out.",
                Days = days
            };
        }

        private static decimal CalculateWorkedHours(TimeSpan? checkIn, TimeSpan? checkOut)
        {
            if (!checkIn.HasValue || !checkOut.HasValue || checkOut <= checkIn)
            {
                return 0;
            }

            var totalMinutes = (checkOut.Value - checkIn.Value).TotalMinutes;
            var lunchStart = TimeSpan.FromHours(12);
            var lunchEnd = TimeSpan.FromHours(13);
            var overlapStart = checkIn.Value > lunchStart ? checkIn.Value : lunchStart;
            var overlapEnd = checkOut.Value < lunchEnd ? checkOut.Value : lunchEnd;
            if (overlapEnd > overlapStart)
            {
                totalMinutes -= (overlapEnd - overlapStart).TotalMinutes;
            }

            return Math.Round((decimal)Math.Max(0, totalMinutes) / 60m, 2);
        }
    }
}
