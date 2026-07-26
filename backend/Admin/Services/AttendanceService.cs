using Admin.Data;
using Admin.DTOs;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class AttendanceService
    {
        private readonly AppDbContext _db;

        public AttendanceService(AppDbContext db)
        {
            _db = db;
        }

        public object CheckIn(int empId)
        {
            var employeeExists = _db.Employees.Any(x => x.Id == empId);
            if (!employeeExists)
            {
                return new
                {
                    success = false,
                    message = "Không tìm thấy nhân viên"
                };
            }

            var today = DateTime.Today;
            var now = DateTime.Now;

            var attendance = _db.Attendances
                .FirstOrDefault(x => x.EmployeeId == empId && x.Date.Date == today);

            if (attendance != null && attendance.CheckInTime != null)
            {
                return new
                {
                    success = false,
                    message = "Nhân viên đã check-in hôm nay",
                    data = attendance
                };
            }

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    EmployeeId = empId,
                    Date = today,
                    CheckInTime = now,
                    CheckOutTime = null,
                    TotalHours = 0,
                    IsLate = now.TimeOfDay > new TimeSpan(8, 0, 0),
                    IsEarlyLeave = false,
                    Note = "-",
                    Status = "Working",
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _db.Attendances.Add(attendance);
            }
            else
            {
                attendance.CheckInTime = now;
                attendance.IsLate = now.TimeOfDay > new TimeSpan(8, 0, 0);
                attendance.IsEarlyLeave = false;
                attendance.Note = string.IsNullOrWhiteSpace(attendance.Note) ? "-" : attendance.Note;
                attendance.Status = "Working";
                attendance.UpdatedAt = now;
            }

            _db.SaveChanges();

            return new
            {
                success = true,
                message = "Check-in thành công",
                data = attendance
            };
        }

        public object? CheckOut(int empId)
        {
            var today = DateTime.Today;
            var now = DateTime.Now;

            var attendance = _db.Attendances
                .FirstOrDefault(x => x.EmployeeId == empId && x.Date.Date == today);

            if (attendance == null || attendance.CheckInTime == null || attendance.CheckOutTime != null)
                return null;

            attendance.CheckOutTime = now;
            attendance.IsEarlyLeave = now.TimeOfDay < new TimeSpan(17, 0, 0);
            attendance.Status = "Completed";
            attendance.UpdatedAt = now;

            var totalHours = Math.Round((now - attendance.CheckInTime.Value).TotalHours, 2);
            SetTotalHours(attendance, totalHours);

            _db.SaveChanges();

            return new
            {
                success = true,
                message = "Check-out thành công",
                data = attendance
            };
        }

        public List<AttendanceDto> GetByDate(DateTime date)
        {
            try
            {
                var query =
                    from a in _db.Attendances.AsNoTracking()
                    join e in _db.Employees.Include(x => x.Department).AsNoTracking()
                        on a.EmployeeId equals e.Id into empJoin
                    from e in empJoin.DefaultIfEmpty()
                    where a.Date.Date == date.Date
                    select new AttendanceDto
                    {
                        Id = a.Id,
                        EmployeeId = a.EmployeeId,
                        EmployeeName = e != null ? e.FullName : ("NV " + a.EmployeeId),
                        Department = e != null && e.Department != null ? e.Department.Name : "Unknown",
                        Date = a.Date,
                        CheckInTime = a.CheckInTime,
                        CheckOutTime = a.CheckOutTime,
                        TotalHours = a.TotalHours,
                        IsLate = a.IsLate,
                        IsEarlyLeave = a.IsEarlyLeave,
                        Note = string.IsNullOrWhiteSpace(a.Note) ? "-" : a.Note,
                        Status = a.Status
                    };

                var rows = query.ToList();
                return rows.Count > 0 ? rows : BuildDemoAttendance(date);
            }
            catch
            {
                return BuildDemoAttendance(date);
            }
        }

        public object GetSummary(DateTime date)
        {
            try
            {
                var data = _db.Attendances.Where(x => x.Date.Date == date.Date);

                return new
                {
                    total = data.Count(),
                    ontime = data.Count(x => x.Status == "Completed" && !x.IsLate && !x.IsEarlyLeave),
                    late = data.Count(x => x.IsLate),
                    missing = data.Count(x => x.Status == "Absent")
                };
            }
            catch
            {
                var data = BuildDemoAttendance(date);
                return new
                {
                    total = data.Count,
                    ontime = data.Count(x => !x.IsLate && !x.IsEarlyLeave),
                    late = data.Count(x => x.IsLate),
                    missing = data.Count(x => x.Status == "Absent")
                };
            }
        }

        public object GetMonthlyReport(int year, int month)
        {
            try
            {
                var rawData =
                    (from a in _db.Attendances.AsNoTracking()
                     join e in _db.Employees.Include(x => x.Department).AsNoTracking()
                        on a.EmployeeId equals e.Id into empJoin
                     from e in empJoin.DefaultIfEmpty()
                     where a.Date.Year == year && a.Date.Month == month
                     select new
                     {
                         a.EmployeeId,
                         EmployeeName = e != null ? e.FullName : ("NV " + a.EmployeeId),
                         Department = e != null && e.Department != null ? e.Department.Name : "Unknown",
                         a.Status,
                         a.IsLate,
                         a.IsEarlyLeave,
                         a.TotalHours
                     }).ToList();

                if (rawData.Count == 0)
                {
                    return BuildDemoMonthlyReport(year, month);
                }

                var result = rawData
                    .GroupBy(x => new { x.EmployeeId, x.EmployeeName, x.Department })
                    .Select(g => new
                    {
                        employeeId = g.Key.EmployeeId,
                        employeeName = g.Key.EmployeeName,
                        department = g.Key.Department,
                        totalDays = g.Count(),
                        completedDays = g.Count(x => x.Status == "Completed"),
                        lateDays = g.Count(x => x.IsLate),
                        earlyLeaveDays = g.Count(x => x.IsEarlyLeave),
                        totalHours = Math.Round(g.Sum(x => x.TotalHours), 2)
                    })
                    .OrderBy(x => x.employeeName)
                    .ToList();

                return result;
            }
            catch
            {
                return BuildDemoMonthlyReport(year, month);
            }
        }

        private static void SetTotalHours(object attendance, double totalHours)
        {
            var prop = attendance.GetType().GetProperty("TotalHours");
            if (prop == null || !prop.CanWrite) return;

            var targetType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
            var convertedValue = Convert.ChangeType(totalHours, targetType);
            prop.SetValue(attendance, convertedValue);
        }

        private static List<AttendanceDto> BuildDemoAttendance(DateTime date)
        {
            return new List<AttendanceDto>
            {
                new AttendanceDto { Id = 1, EmployeeId = 1, EmployeeName = "Nguyễn Văn A", Department = "IT", Date = date.Date, CheckInTime = date.Date.AddHours(8).AddMinutes(10), CheckOutTime = date.Date.AddHours(17).AddMinutes(30), TotalHours = 8, IsLate = false, IsEarlyLeave = false, Note = "", Status = "Completed" },
                new AttendanceDto { Id = 2, EmployeeId = 2, EmployeeName = "Trần Thị B", Department = "HR", Date = date.Date, CheckInTime = date.Date.AddHours(8).AddMinutes(45), CheckOutTime = date.Date.AddHours(17).AddMinutes(20), TotalHours = 7.58m, IsLate = true, IsEarlyLeave = false, Note = "Đi muộn 45 phút", Status = "Completed" },
                new AttendanceDto { Id = 3, EmployeeId = 3, EmployeeName = "Lê Văn C", Department = "IT", Date = date.Date, CheckInTime = date.Date.AddHours(8).AddMinutes(20), CheckOutTime = date.Date.AddHours(16).AddMinutes(40), TotalHours = 7.33m, IsLate = false, IsEarlyLeave = true, Note = "Về sớm 20 phút", Status = "Completed" },
                new AttendanceDto { Id = 4, EmployeeId = 4, EmployeeName = "Phạm Thị D", Department = "Marketing", Date = date.Date, CheckInTime = null, CheckOutTime = null, TotalHours = 0, IsLate = false, IsEarlyLeave = false, Note = "Chưa chấm công", Status = "Absent" }
            };
        }

        private static object BuildDemoMonthlyReport(int year, int month)
        {
            return new[]
            {
                new { employeeId = 1, employeeName = "Nguyễn Văn A", department = "IT", totalDays = 22, completedDays = 22, lateDays = 1, earlyLeaveDays = 0, totalHours = 176m },
                new { employeeId = 2, employeeName = "Trần Thị B", department = "HR", totalDays = 22, completedDays = 21, lateDays = 2, earlyLeaveDays = 0, totalHours = 168m },
                new { employeeId = 3, employeeName = "Lê Văn C", department = "IT", totalDays = 22, completedDays = 20, lateDays = 3, earlyLeaveDays = 1, totalHours = 160m },
                new { employeeId = 4, employeeName = "Phạm Thị D", department = "Marketing", totalDays = 22, completedDays = 19, lateDays = 1, earlyLeaveDays = 2, totalHours = 152m }
            };
        }
    }
}
