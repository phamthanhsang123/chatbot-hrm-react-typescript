using Admin.Data;
using Admin.DTOs;
using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Services
{
    public class AttendanceService
    {
        private static readonly TimeSpan LateAfter = new(8, 30, 0);
        private static readonly TimeSpan EarlyBefore = new(17, 30, 0);
        private readonly AppDbContext _db;

        public AttendanceService(AppDbContext db)
        {
            _db = db;
        }

        public Task<Employee?> GetActorAsync(string email)
        {
            var normalizedEmail = email.Trim().ToLower();
            return _db.Employees
                .Include(x => x.Department)
                .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);
        }

        public async Task<object> CheckInAsync(Employee actor, int employeeId)
        {
            EnsureOwnAttendance(actor, employeeId);

            var today = DateTime.Today;
            var now = DateTime.Now;
            var attendance = await _db.Attendances
                .FirstOrDefaultAsync(x => x.EmployeeId == employeeId && x.Date.Date == today);

            if (attendance?.CheckInTime != null)
            {
                return new
                {
                    success = false,
                    message = "Bạn đã check-in hôm nay.",
                    data = ToAttendanceDto(attendance, actor)
                };
            }

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    EmployeeId = employeeId,
                    Date = today,
                    CheckInTime = now.TimeOfDay,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _db.Attendances.Add(attendance);
            }
            else
            {
                attendance.CheckInTime = now.TimeOfDay;
                attendance.UpdatedAt = now;
            }

            var shifts = await _db.AttendanceShifts
                .Where(x => x.EmployeeId == employeeId && x.WorkDate.Date == today && x.Status == "PLANNED")
                .ToListAsync();
            foreach (var shift in shifts)
            {
                shift.Status = "WORKING";
                shift.UpdatedAt = now;
            }

            await _db.SaveChangesAsync();

            return new
            {
                success = true,
                message = "Check-in thành công.",
                data = ToAttendanceDto(attendance, actor)
            };
        }

        public async Task<object?> CheckOutAsync(Employee actor, int employeeId, AttendanceCheckOutDto? dto)
        {
            EnsureOwnAttendance(actor, employeeId);

            var today = DateTime.Today;
            var attendance = await _db.Attendances
                .FirstOrDefaultAsync(x => x.EmployeeId == employeeId && x.Date.Date == today);

            if (attendance?.CheckInTime == null || attendance.CheckOutTime != null)
            {
                return null;
            }

            var now = DateTime.Now;
            attendance.CheckOutTime = now.TimeOfDay;
            attendance.WorkReportTitle = CleanOptional(dto?.WorkReportTitle, 255);
            attendance.WorkReportDescription = CleanOptional(dto?.WorkReportDescription, 4000);
            attendance.WorkReportNote = CleanOptional(dto?.WorkReportNote, 2000);
            attendance.UpdatedAt = now;

            var shifts = await _db.AttendanceShifts
                .Where(x => x.EmployeeId == employeeId && x.WorkDate.Date == today && x.Status != "CANCELLED")
                .ToListAsync();
            foreach (var shift in shifts)
            {
                shift.Status = "COMPLETED";
                shift.UpdatedAt = now;
            }

            await _db.SaveChangesAsync();

            return new
            {
                success = true,
                message = "Check-out thành công.",
                data = ToAttendanceDto(attendance, actor)
            };
        }

        public async Task<List<AttendanceDto>> GetByDateAsync(DateTime date, Employee actor)
        {
            var rows = await ApplyAttendanceScope(_db.Attendances.AsNoTracking(), actor)
                .Where(x => x.Date.Date == date.Date)
                .ToListAsync();

            return await MapAttendanceListAsync(rows);
        }

        public async Task<AttendanceDto> UpdateWorkReportAsync(
            Employee actor,
            int attendanceId,
            AttendanceWorkReportDto dto)
        {
            var attendance = await _db.Attendances
                .FirstOrDefaultAsync(x => x.Id == attendanceId);

            if (attendance == null)
            {
                throw new KeyNotFoundException("Không tìm thấy bản ghi chấm công.");
            }

            EnsureOwnAttendance(actor, attendance.EmployeeId);

            if (!attendance.CheckOutTime.HasValue)
            {
                throw new InvalidOperationException("Chỉ cập nhật báo cáo sau khi đã kết thúc ca.");
            }

            attendance.WorkReportTitle = CleanOptional(dto.WorkReportTitle, 255);
            attendance.WorkReportDescription = CleanOptional(dto.WorkReportDescription, 4000);
            attendance.WorkReportNote = CleanOptional(dto.WorkReportNote, 2000);
            attendance.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
            return ToAttendanceDto(attendance, actor);
        }

        public async Task<object> GetSummaryAsync(DateTime date, Employee actor)
        {
            var rows = await GetByDateAsync(date, actor);
            var employeeCount = await ApplyEmployeeScope(_db.Employees.AsNoTracking(), actor)
                .CountAsync(x => x.Status == "active" || x.Status == "Đang làm việc");

            var isWorkingDay = date.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday;
            return new
            {
                total = employeeCount,
                checkedIn = rows.Count(x => x.CheckInTime.HasValue),
                ontime = rows.Count(x => x.CheckInTime.HasValue && !x.IsLate),
                late = rows.Count(x => x.IsLate),
                earlyLeave = rows.Count(x => x.IsEarlyLeave),
                missing = isWorkingDay ? Math.Max(0, employeeCount - rows.Count(x => x.CheckInTime.HasValue)) : 0
            };
        }

        public async Task<object> GetMonthlyReportAsync(int year, int month, Employee actor)
        {
            if (month is < 1 or > 12)
            {
                throw new InvalidOperationException("Tháng không hợp lệ.");
            }

            var rows = await ApplyAttendanceScope(_db.Attendances.AsNoTracking(), actor)
                .Where(x => x.Date.Year == year && x.Date.Month == month)
                .ToListAsync();
            var mapped = await MapAttendanceListAsync(rows);

            return mapped
                .GroupBy(x => new { x.EmployeeId, x.EmployeeName, x.Department })
                .Select(group => new
                {
                    employeeId = group.Key.EmployeeId,
                    employeeName = group.Key.EmployeeName,
                    department = group.Key.Department,
                    totalDays = group.Count(),
                    completedDays = group.Count(x => x.CheckInTime.HasValue && x.CheckOutTime.HasValue),
                    lateDays = group.Count(x => x.IsLate),
                    earlyLeaveDays = group.Count(x => x.IsEarlyLeave),
                    totalHours = Math.Round(group.Sum(x => x.TotalHours), 2)
                })
                .OrderBy(x => x.employeeName)
                .ToList();
        }

        public async Task<List<AttendanceDto>> GetMonthlyRecordsAsync(int year, int month, Employee actor)
        {
            if (month is < 1 or > 12)
            {
                throw new InvalidOperationException("Tháng không hợp lệ.");
            }

            var rows = await ApplyAttendanceScope(_db.Attendances.AsNoTracking(), actor)
                .Where(x => x.Date.Year == year && x.Date.Month == month)
                .OrderByDescending(x => x.Date)
                .ToListAsync();
            return await MapAttendanceListAsync(rows);
        }

        public async Task<List<AttendanceRequestResponseDto>> GetRequestsAsync(Employee actor, string? status)
        {
            var query = _db.AttendanceRequests
                .AsNoTracking()
                .Include(x => x.Employee)
                    .ThenInclude(x => x.Department)
                .Include(x => x.Reviewer)
                .AsQueryable();

            query = ApplyRequestScope(query, actor);

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
            {
                var normalizedStatus = status.Trim().ToUpperInvariant();
                query = query.Where(x => x.Status == normalizedStatus);
            }

            var rows = await query
                .OrderByDescending(x => x.Status == "PENDING")
                .ThenByDescending(x => x.SubmittedAt)
                .ToListAsync();

            return rows.Select(ToRequestResponse).ToList();
        }

        public async Task<AttendanceRequestResponseDto> CreateRequestAsync(
            Employee actor,
            CreateAttendanceRequestDto dto)
        {
            if (actor.Id != dto.EmployeeId)
            {
                throw new UnauthorizedAccessException("Nhân viên chỉ được gửi đơn chấm công của chính mình.");
            }

            if (!DateTime.TryParse(dto.WorkDate, out var workDate))
            {
                throw new InvalidOperationException("Ngày chấm công không hợp lệ.");
            }

            workDate = workDate.Date;
            if (workDate > DateTime.Today)
            {
                throw new InvalidOperationException("Không thể gửi đơn cho ngày trong tương lai.");
            }

            var requestType = dto.RequestType.Trim().ToUpperInvariant();
            if (requestType is not ("SUPPLEMENT" or "ADJUSTMENT"))
            {
                throw new InvalidOperationException("Loại đơn phải là SUPPLEMENT hoặc ADJUSTMENT.");
            }

            if (!TryBuildDateTime(workDate, dto.RequestedCheckIn, out var requestedCheckIn) ||
                !TryBuildDateTime(workDate, dto.RequestedCheckOut, out var requestedCheckOut))
            {
                throw new InvalidOperationException("Giờ vào hoặc giờ ra không hợp lệ.");
            }

            if (requestedCheckOut <= requestedCheckIn)
            {
                throw new InvalidOperationException("Giờ ra phải sau giờ vào.");
            }

            if (string.IsNullOrWhiteSpace(dto.Reason) || dto.Reason.Trim().Length < 10)
            {
                throw new InvalidOperationException("Lý do phải có ít nhất 10 ký tự.");
            }

            var hasPendingRequest = await _db.AttendanceRequests.AnyAsync(x =>
                x.EmployeeId == actor.Id &&
                x.WorkDate.Date == workDate &&
                x.Status == "PENDING");

            if (hasPendingRequest)
            {
                throw new InvalidOperationException("Ngày này đã có một đơn đang chờ duyệt.");
            }

            var attendance = await _db.Attendances.AsNoTracking()
                .FirstOrDefaultAsync(x => x.EmployeeId == actor.Id && x.Date.Date == workDate);

            if (requestType == "ADJUSTMENT" && attendance == null)
            {
                throw new InvalidOperationException("Chưa có dữ liệu chấm công để điều chỉnh. Hãy chọn bổ sung công.");
            }

            var request = new AttendanceRequest
            {
                EmployeeId = actor.Id,
                WorkDate = workDate,
                RequestType = requestType,
                RequestedCheckIn = requestedCheckIn,
                RequestedCheckOut = requestedCheckOut,
                OriginalCheckIn = attendance?.CheckInTime.HasValue == true
                    ? workDate.Add(attendance.CheckInTime.Value)
                    : null,
                OriginalCheckOut = attendance?.CheckOutTime.HasValue == true
                    ? workDate.Add(attendance.CheckOutTime.Value)
                    : null,
                Reason = dto.Reason.Trim(),
                WorkReportTitle = CleanOptional(dto.WorkReportTitle, 255),
                WorkReportDescription = CleanOptional(dto.WorkReportDescription, 4000),
                Status = "PENDING",
                SubmittedAt = DateTime.Now
            };

            _db.AttendanceRequests.Add(request);
            await _db.SaveChangesAsync();

            request.Employee = actor;
            return ToRequestResponse(request);
        }

        public async Task<AttendanceRequestResponseDto> ReviewRequestAsync(
            Employee actor,
            int requestId,
            bool approve,
            string? note)
        {
            EnsureReviewerRole(actor);

            AttendanceRequestResponseDto? response = null;
            var executionStrategy = _db.Database.CreateExecutionStrategy();

            await executionStrategy.ExecuteAsync(async () =>
            {
            await using var transaction = await _db.Database.BeginTransactionAsync();
            var request = await _db.AttendanceRequests
                .Include(x => x.Employee)
                    .ThenInclude(x => x.Department)
                .Include(x => x.Reviewer)
                .FirstOrDefaultAsync(x => x.Id == requestId);

            if (request == null)
            {
                throw new KeyNotFoundException("Không tìm thấy đơn chấm công.");
            }

            if (!CanReviewEmployee(actor, request.Employee))
            {
                throw new UnauthorizedAccessException("Bạn không có quyền duyệt đơn của nhân viên này.");
            }

            if (actor.Id == request.EmployeeId)
            {
                throw new UnauthorizedAccessException("Không được tự duyệt đơn chấm công của chính mình.");
            }

            if (request.Status != "PENDING")
            {
                throw new InvalidOperationException("Đơn này đã được xử lý trước đó.");
            }

            request.Status = approve ? "APPROVED" : "REJECTED";
            request.ReviewedById = actor.Id;
            request.Reviewer = actor;
            request.ReviewedAt = DateTime.Now;
            request.ReviewNote = string.IsNullOrWhiteSpace(note)
                ? (approve ? "Đơn được phê duyệt." : "Đơn bị từ chối.")
                : note.Trim();

            if (approve)
            {
                var attendance = await _db.Attendances.FirstOrDefaultAsync(x =>
                    x.EmployeeId == request.EmployeeId &&
                    x.Date.Date == request.WorkDate.Date);

                if (attendance == null)
                {
                    attendance = new Attendance
                    {
                        EmployeeId = request.EmployeeId,
                        Date = request.WorkDate.Date,
                        CreatedAt = DateTime.Now
                    };
                    _db.Attendances.Add(attendance);
                }

                attendance.CheckInTime = request.RequestedCheckIn?.TimeOfDay;
                attendance.CheckOutTime = request.RequestedCheckOut?.TimeOfDay;
                attendance.WorkReportTitle = request.WorkReportTitle;
                attendance.WorkReportDescription = request.WorkReportDescription;
                attendance.UpdatedAt = DateTime.Now;
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            request.Reviewer = actor;
            response = ToRequestResponse(request);
            });

            return response ?? throw new InvalidOperationException("Không thể xử lý đơn chấm công.");
        }

        public async Task<List<AttendanceShiftResponseDto>> GetShiftsAsync(
            Employee actor,
            int year,
            int month,
            int? employeeId)
        {
            if (month is < 1 or > 12)
            {
                throw new InvalidOperationException("Tháng không hợp lệ.");
            }

            var query = ApplyShiftScope(_db.AttendanceShifts.AsNoTracking(), actor);
            if (employeeId.HasValue)
            {
                query = query.Where(x => x.EmployeeId == employeeId.Value);
            }

            var rows = await query
                .Where(x => x.WorkDate.Year == year && x.WorkDate.Month == month)
                .OrderBy(x => x.WorkDate)
                .ThenBy(x => x.StartTime)
                .ToListAsync();

            return rows.Select(ToShiftResponse).ToList();
        }

        public async Task<AttendanceShiftResponseDto> CreateShiftAsync(
            Employee actor,
            SaveAttendanceShiftDto dto)
        {
            EnsureOwnAttendance(actor, dto.EmployeeId);
            var values = ValidateShift(dto);
            var now = DateTime.Now;

            var shift = new AttendanceShift
            {
                EmployeeId = dto.EmployeeId,
                WorkDate = values.WorkDate,
                StartTime = values.StartTime,
                EndTime = values.EndTime,
                Title = values.Title,
                Description = values.Description,
                Status = "PLANNED",
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.AttendanceShifts.Add(shift);
            await _db.SaveChangesAsync();
            return ToShiftResponse(shift);
        }

        public async Task<AttendanceShiftResponseDto> UpdateShiftAsync(
            Employee actor,
            int shiftId,
            SaveAttendanceShiftDto dto)
        {
            EnsureOwnAttendance(actor, dto.EmployeeId);
            var shift = await _db.AttendanceShifts.FirstOrDefaultAsync(x => x.Id == shiftId);
            if (shift == null)
            {
                throw new KeyNotFoundException("Không tìm thấy ca làm.");
            }

            EnsureOwnAttendance(actor, shift.EmployeeId);
            var values = ValidateShift(dto);
            shift.WorkDate = values.WorkDate;
            shift.StartTime = values.StartTime;
            shift.EndTime = values.EndTime;
            shift.Title = values.Title;
            shift.Description = values.Description;
            shift.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
            return ToShiftResponse(shift);
        }

        public async Task DeleteShiftAsync(Employee actor, int shiftId)
        {
            var shift = await _db.AttendanceShifts.FirstOrDefaultAsync(x => x.Id == shiftId);
            if (shift == null)
            {
                throw new KeyNotFoundException("Không tìm thấy ca làm.");
            }

            EnsureOwnAttendance(actor, shift.EmployeeId);
            if (shift.Status != "PLANNED")
            {
                throw new InvalidOperationException("Chỉ ca chưa bắt đầu mới được xóa.");
            }

            _db.AttendanceShifts.Remove(shift);
            await _db.SaveChangesAsync();
        }

        private IQueryable<Attendance> ApplyAttendanceScope(IQueryable<Attendance> query, Employee actor)
        {
            var role = NormalizeRole(actor.Role);
            if (role == "EMPLOYEE")
            {
                return query.Where(x => x.EmployeeId == actor.Id);
            }

            if (role == "MANAGER")
            {
                if (!actor.DepartmentId.HasValue)
                {
                    return query.Where(_ => false);
                }

                var departmentId = actor.DepartmentId.Value;
                return query.Where(x => _db.Employees.Any(employee =>
                    employee.Id == x.EmployeeId &&
                    employee.DepartmentId == departmentId));
            }

            return query;
        }

        private IQueryable<AttendanceShift> ApplyShiftScope(IQueryable<AttendanceShift> query, Employee actor)
        {
            var role = NormalizeRole(actor.Role);
            if (role == "EMPLOYEE")
            {
                return query.Where(x => x.EmployeeId == actor.Id);
            }

            if (role == "MANAGER")
            {
                if (!actor.DepartmentId.HasValue)
                {
                    return query.Where(_ => false);
                }

                var departmentId = actor.DepartmentId.Value;
                return query.Where(x => _db.Employees.Any(employee =>
                    employee.Id == x.EmployeeId &&
                    employee.DepartmentId == departmentId));
            }

            return query;
        }

        private static IQueryable<Employee> ApplyEmployeeScope(IQueryable<Employee> query, Employee actor)
        {
            var role = NormalizeRole(actor.Role);
            if (role == "EMPLOYEE")
            {
                return query.Where(x => x.Id == actor.Id);
            }

            if (role == "MANAGER")
            {
                return actor.DepartmentId.HasValue
                    ? query.Where(x => x.DepartmentId == actor.DepartmentId)
                    : query.Where(_ => false);
            }

            return query;
        }

        private static IQueryable<AttendanceRequest> ApplyRequestScope(
            IQueryable<AttendanceRequest> query,
            Employee actor)
        {
            var role = NormalizeRole(actor.Role);
            if (role == "EMPLOYEE")
            {
                return query.Where(x => x.EmployeeId == actor.Id);
            }

            if (role == "MANAGER")
            {
                return actor.DepartmentId.HasValue
                    ? query.Where(x => x.Employee.DepartmentId == actor.DepartmentId)
                    : query.Where(_ => false);
            }

            return query;
        }

        private async Task<List<AttendanceDto>> MapAttendanceListAsync(List<Attendance> rows)
        {
            if (rows.Count == 0)
            {
                return new List<AttendanceDto>();
            }

            var employeeIds = rows.Select(x => x.EmployeeId).Distinct().ToList();
            var employees = await _db.Employees
                .AsNoTracking()
                .Include(x => x.Department)
                .Where(x => employeeIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id);

            return rows.Select(row =>
            {
                employees.TryGetValue(row.EmployeeId, out var employee);
                return ToAttendanceDto(row, employee);
            }).ToList();
        }

        private static AttendanceDto ToAttendanceDto(Attendance row, Employee? employee)
        {
            var isLate = row.CheckInTime > LateAfter;
            var isEarlyLeave = row.CheckOutTime.HasValue && row.CheckOutTime.Value < EarlyBefore;
            var status = row.CheckInTime == null
                ? "Absent"
                : row.CheckOutTime == null
                    ? "Working"
                    : "Completed";

            var notes = new List<string>();
            if (isLate) notes.Add("Đi muộn");
            if (isEarlyLeave) notes.Add("Về sớm");

            return new AttendanceDto
            {
                Id = row.Id,
                EmployeeId = row.EmployeeId,
                EmployeeName = employee?.FullName ?? $"NV {row.EmployeeId}",
                Department = employee?.Department?.Name ?? "Chưa có phòng ban",
                Date = row.Date,
                CheckInTime = row.CheckInTime.HasValue ? row.Date.Date.Add(row.CheckInTime.Value) : null,
                CheckOutTime = row.CheckOutTime.HasValue ? row.Date.Date.Add(row.CheckOutTime.Value) : null,
                TotalHours = CalculateWorkedHours(row.CheckInTime, row.CheckOutTime),
                IsLate = isLate,
                IsEarlyLeave = isEarlyLeave,
                Note = notes.Count == 0 ? "-" : string.Join(", ", notes),
                Status = status,
                WorkReportTitle = row.WorkReportTitle,
                WorkReportDescription = row.WorkReportDescription,
                WorkReportNote = row.WorkReportNote
            };
        }

        private static AttendanceRequestResponseDto ToRequestResponse(AttendanceRequest request)
        {
            return new AttendanceRequestResponseDto
            {
                Id = request.Id,
                EmployeeId = request.EmployeeId,
                EmployeeName = request.Employee?.FullName ?? $"NV {request.EmployeeId}",
                DepartmentId = request.Employee?.DepartmentId,
                Department = request.Employee?.Department?.Name ?? "Chưa có phòng ban",
                WorkDate = request.WorkDate,
                RequestType = request.RequestType,
                RequestedCheckIn = request.RequestedCheckIn,
                RequestedCheckOut = request.RequestedCheckOut,
                OriginalCheckIn = request.OriginalCheckIn,
                OriginalCheckOut = request.OriginalCheckOut,
                Reason = request.Reason,
                WorkReportTitle = request.WorkReportTitle,
                WorkReportDescription = request.WorkReportDescription,
                Status = request.Status,
                SubmittedAt = request.SubmittedAt,
                ReviewedAt = request.ReviewedAt,
                ReviewedById = request.ReviewedById,
                ReviewedBy = request.Reviewer?.FullName,
                ReviewNote = request.ReviewNote
            };
        }

        private static AttendanceShiftResponseDto ToShiftResponse(AttendanceShift shift)
        {
            return new AttendanceShiftResponseDto
            {
                Id = shift.Id,
                EmployeeId = shift.EmployeeId,
                WorkDate = shift.WorkDate,
                StartTime = shift.StartTime.ToString(@"hh\:mm"),
                EndTime = shift.EndTime.ToString(@"hh\:mm"),
                Title = shift.Title,
                Description = shift.Description,
                Status = shift.Status,
                CreatedAt = shift.CreatedAt,
                UpdatedAt = shift.UpdatedAt
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

        private static bool TryBuildDateTime(DateTime date, string value, out DateTime result)
        {
            if (TimeSpan.TryParse(value, out var time) && time >= TimeSpan.Zero && time < TimeSpan.FromDays(1))
            {
                result = date.Date.Add(time);
                return true;
            }

            result = default;
            return false;
        }

        private static (DateTime WorkDate, TimeSpan StartTime, TimeSpan EndTime, string Title, string? Description)
            ValidateShift(SaveAttendanceShiftDto dto)
        {
            if (!DateTime.TryParse(dto.WorkDate, out var workDate))
            {
                throw new InvalidOperationException("Ngày ca làm không hợp lệ.");
            }

            if (!TimeSpan.TryParse(dto.StartTime, out var startTime) ||
                !TimeSpan.TryParse(dto.EndTime, out var endTime) ||
                startTime < TimeSpan.Zero ||
                endTime >= TimeSpan.FromDays(1) ||
                endTime <= startTime)
            {
                throw new InvalidOperationException("Giờ bắt đầu hoặc kết thúc ca không hợp lệ.");
            }

            var title = CleanOptional(dto.Title, 255);
            if (string.IsNullOrWhiteSpace(title))
            {
                throw new InvalidOperationException("Nội dung ca làm không được để trống.");
            }

            return (
                workDate.Date,
                startTime,
                endTime,
                title!,
                CleanOptional(dto.Description, 4000));
        }

        private static string? CleanOptional(string? value, int maxLength)
        {
            var cleaned = value?.Trim();
            if (string.IsNullOrWhiteSpace(cleaned))
            {
                return null;
            }

            return cleaned.Length <= maxLength ? cleaned : cleaned[..maxLength];
        }

        private static bool CanReviewEmployee(Employee actor, Employee employee)
        {
            var role = NormalizeRole(actor.Role);
            return role == "ADMIN" ||
                   (role == "MANAGER" &&
                    actor.DepartmentId.HasValue &&
                    actor.DepartmentId == employee.DepartmentId);
        }

        private static void EnsureOwnAttendance(Employee actor, int employeeId)
        {
            if (actor.Id != employeeId)
            {
                throw new UnauthorizedAccessException("Bạn chỉ được chấm công cho chính mình.");
            }
        }

        private static void EnsureReviewerRole(Employee actor)
        {
            var role = NormalizeRole(actor.Role);
            if (role is not ("ADMIN" or "MANAGER"))
            {
                throw new UnauthorizedAccessException("Chỉ Admin hoặc Manager mới được duyệt đơn.");
            }
        }

        private static string NormalizeRole(string? role) => role?.Trim().ToUpperInvariant() ?? "EMPLOYEE";
    }
}
