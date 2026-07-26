using Admin.Data;
using Admin.DTOs;
using Admin.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace Admin.Services
{
    public class LeaveRequestService
    {
        private readonly AppDbContext _db;

        public LeaveRequestService(AppDbContext db)
        {
            _db = db;
        }

        public List<LeaveRequestDto> GetAll(
            string? status,
            int? employeeId = null,
            int? departmentId = null)
        {
            var query =
                from leave in _db.LeaveRequests.AsNoTracking()
                join employee in _db.Employees.AsNoTracking()
                    on leave.EmployeeId equals employee.Id
                join leaveType in _db.LeaveTypes.AsNoTracking()
                    on leave.LeaveTypeId equals leaveType.Id
                where !employeeId.HasValue || employee.Id == employeeId.Value
                where !departmentId.HasValue || employee.DepartmentId == departmentId.Value
                select new LeaveRequestDto
                {
                    Id = leave.Id,
                    EmployeeId = employee.Id,
                    EmployeeName = employee.FullName ?? "",
                    LeaveType = leaveType.Name ?? "Nghỉ phép năm",
                    StartDate = leave.StartDate,
                    EndDate = leave.EndDate,
                    TotalDays = leave.TotalDays,
                    Reason = leave.Reason ?? "",
                    Status = leave.Status ?? "Chờ duyệt"
                };

            var normalizedStatus = NormalizeStatus(status);
            if (!string.IsNullOrWhiteSpace(normalizedStatus))
            {
                query = query.Where(x => x.Status == normalizedStatus);
            }

            var results = query
                .OrderByDescending(x => x.StartDate)
                .ThenByDescending(x => x.Id)
                .ToList();

            foreach (var result in results)
            {
                result.TotalDays = Math.Max(1, (result.EndDate.Date - result.StartDate.Date).Days + 1);
            }

            return results;
        }

        public LeaveRequestDto Create(LeaveRequestCreateDto dto)
        {
            var start = ParseDate(dto.StartDate, "StartDate");
            var end = ParseDate(dto.EndDate, "EndDate");

            if (end < start)
            {
                throw new InvalidOperationException("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
            }

            if (!_db.Employees.Any(x => x.Id == dto.EmployeeId))
            {
                throw new InvalidOperationException("Nhân viên không tồn tại.");
            }

            var leaveType = _db.LeaveTypes
                .AsNoTracking()
                .FirstOrDefault(x => x.Id == dto.LeaveTypeId);

            if (leaveType == null)
            {
                throw new InvalidOperationException("Loại nghỉ phép không tồn tại.");
            }

            var overlaps = _db.LeaveRequests.Any(x =>
                x.EmployeeId == dto.EmployeeId &&
                x.Status != "Từ chối" &&
                x.StartDate <= end &&
                x.EndDate >= start);

            if (overlaps)
            {
                throw new InvalidOperationException("Khoảng ngày này đã có đơn nghỉ phép đang xử lý.");
            }

            var leave = new LeaveRequest
            {
                EmployeeId = dto.EmployeeId,
                LeaveTypeId = dto.LeaveTypeId,
                StartDate = start,
                EndDate = end,
                TotalDays = (end - start).Days + 1,
                Reason = dto.Reason.Trim(),
                Status = "Chờ duyệt",
                CreatedAt = DateTime.Now
            };

            _db.LeaveRequests.Add(leave);
            _db.SaveChanges();

            var employeeName = _db.Employees
                .AsNoTracking()
                .Where(x => x.Id == dto.EmployeeId)
                .Select(x => x.FullName)
                .First();

            return new LeaveRequestDto
            {
                Id = leave.Id,
                EmployeeId = leave.EmployeeId,
                EmployeeName = employeeName,
                LeaveType = leaveType.Name,
                StartDate = leave.StartDate,
                EndDate = leave.EndDate,
                TotalDays = leave.TotalDays,
                Reason = leave.Reason,
                Status = leave.Status
            };
        }

        public bool Approve(int id, int? departmentId = null)
        {
            return Review(id, "Đã duyệt", departmentId);
        }

        public bool Reject(int id, int? departmentId = null)
        {
            return Review(id, "Từ chối", departmentId);
        }

        public object Dashboard(int? departmentId = null)
        {
            var today = DateTime.Today;
            var query =
                from leave in _db.LeaveRequests.AsNoTracking()
                join employee in _db.Employees.AsNoTracking()
                    on leave.EmployeeId equals employee.Id
                where !departmentId.HasValue || employee.DepartmentId == departmentId.Value
                select leave;

            return new
            {
                pending = query.Count(x => x.Status == "Chờ duyệt" || x.Status == "PENDING"),
                approved = query.Count(x => x.Status == "Đã duyệt" || x.Status == "APPROVED"),
                rejected = query.Count(x => x.Status == "Từ chối" || x.Status == "REJECTED"),
                onLeaveToday = query.Count(x =>
                    (x.Status == "Đã duyệt" || x.Status == "APPROVED") &&
                    x.StartDate <= today &&
                    x.EndDate >= today)
            };
        }

        public int? GetDepartmentId(int employeeId)
        {
            return _db.Employees
                .AsNoTracking()
                .Where(x => x.Id == employeeId)
                .Select(x => x.DepartmentId)
                .FirstOrDefault();
        }

        private bool Review(int id, string nextStatus, int? departmentId)
        {
            var query =
                from leave in _db.LeaveRequests
                join employee in _db.Employees
                    on leave.EmployeeId equals employee.Id
                where leave.Id == id
                where !departmentId.HasValue || employee.DepartmentId == departmentId.Value
                select leave;

            var request = query.FirstOrDefault();
            if (request == null ||
                (request.Status != "Chờ duyệt" && request.Status != "PENDING"))
            {
                return false;
            }

            request.Status = nextStatus;
            _db.SaveChanges();
            return true;
        }

        private static DateTime ParseDate(string value, string fieldName)
        {
            var formats = new[] { "yyyy-MM-dd", "dd/MM/yyyy" };
            if (DateTime.TryParseExact(
                value,
                formats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var parsed))
            {
                return parsed.Date;
            }

            throw new InvalidOperationException($"{fieldName} không đúng định dạng.");
        }

        private static string? NormalizeStatus(string? status)
        {
            return status?.Trim().ToLowerInvariant() switch
            {
                null or "" or "all" => null,
                "pending" or "chờ duyệt" => "Chờ duyệt",
                "approved" or "đã duyệt" => "Đã duyệt",
                "rejected" or "từ chối" => "Từ chối",
                _ => status
            };
        }
    }
}
