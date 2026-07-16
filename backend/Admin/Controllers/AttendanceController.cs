using Admin.Services;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [ApiController]
    [Route("api/admin/attendance")]
    public class AttendanceController : ControllerBase
    {
        private readonly AttendanceService _service;
        private static readonly object RequestLock = new();
        private static readonly List<AttendanceRequestDto> DemoRequests = new()
        {
            new AttendanceRequestDto(1, "Nguyễn Văn An", "NV001", "IT", "12/01/2026", "08:30", "17:30", "Quên chấm công do họp khách hàng bên ngoài văn phòng.", "pending", "13/01/2026 08:30", null, null, null, "supplement", null, null),
            new AttendanceRequestDto(2, "Trần Thị Bình", "NV002", "HR", "11/01/2026", "08:25", "17:25", "Lỗi hệ thống chấm công, không quét được vân tay.", "pending", "12/01/2026 09:00", null, null, null, "supplement", null, null),
            new AttendanceRequestDto(3, "Lê Hoàng Cường", "NV003", "Marketing", "10/01/2026", "08:20", "17:35", "Đi công tác tại chi nhánh Đà Nẵng.", "pending", "11/01/2026 14:20", null, null, null, "supplement", null, null),
            new AttendanceRequestDto(4, "Hoàng Minh Tuấn", "NV006", "IT", "14/01/2026", "08:30", "17:40", "Sai giờ ra, thực tế ra lúc 17:40 do làm thêm.", "pending", "15/01/2026 08:00", null, null, null, "adjustment", "08:20", "17:35")
        };

        public AttendanceController(AttendanceService service)
        {
            _service = service;
        }

        [HttpGet("requests")]
        public IActionResult GetRequests()
        {
            lock (RequestLock)
            {
                return Ok(DemoRequests);
            }
        }

        [HttpPost("requests/{id}/approve")]
        public IActionResult ApproveRequest(int id, [FromBody] AttendanceReviewDto? dto)
        {
            return ReviewRequest(id, "approved", dto?.Note);
        }

        [HttpPost("requests/{id}/reject")]
        public IActionResult RejectRequest(int id, [FromBody] AttendanceReviewDto? dto)
        {
            return ReviewRequest(id, "rejected", dto?.Note);
        }

        private IActionResult ReviewRequest(int id, string status, string? note)
        {
            lock (RequestLock)
            {
                var index = DemoRequests.FindIndex(x => x.Id == id);
                if (index < 0) return NotFound();

                var current = DemoRequests[index];
                DemoRequests[index] = current with
                {
                    Status = status,
                    ReviewedAt = DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                    ReviewedBy = "HR Manager",
                    ReviewNote = string.IsNullOrWhiteSpace(note)
                        ? (status == "approved" ? "Đơn được phê duyệt" : "Đơn bị từ chối")
                        : note
                };

                return Ok(DemoRequests[index]);
            }
        }

        // CHECK-IN
        [HttpPost("checkin/{empId}")]
        public IActionResult CheckIn(int empId)
        {
            var result = _service.CheckIn(empId);
            return Ok(result);
        }

        // CHECK-OUT
        [HttpPost("checkout/{empId}")]
        public IActionResult CheckOut(int empId)
        {
            var result = _service.CheckOut(empId);

            if (result == null)
                return BadRequest("Chưa check-in hoặc đã check-out");

            return Ok(result);
        }

        // DAILY LIST - GIỮ PHẦN MỚI
        [HttpGet]
        public IActionResult GetByDate([FromQuery] string? date)
        {
            if (string.IsNullOrWhiteSpace(date))
                return BadRequest("Thiếu date");

            if (!DateTime.TryParse(date, out var parsedDate))
                return BadRequest("Date không hợp lệ");

            var result = _service.GetByDate(parsedDate);
            return Ok(result);
        }

        // SUMMARY - GIỮ PHẦN MỚI
        [HttpGet("summary")]
        public IActionResult GetSummary([FromQuery] string? date)
        {
            if (string.IsNullOrWhiteSpace(date))
                return BadRequest("Thiếu date");

            if (!DateTime.TryParse(date, out var parsedDate))
                return BadRequest("Date không hợp lệ");

            var result = _service.GetSummary(parsedDate);
            return Ok(result);
        }

        // MONTHLY REPORT - GIỮ API CŨ
        [HttpGet("report")]
        public IActionResult MonthlyReport([FromQuery] int year, [FromQuery] int month)
        {
            var result = _service.GetMonthlyReport(year, month);
            return Ok(result);
        }
    }

    public record AttendanceReviewDto(string? Note);

    public record AttendanceRequestDto(
        int Id,
        string EmployeeName,
        string EmployeeId,
        string Department,
        string Date,
        string CheckIn,
        string CheckOut,
        string Reason,
        string Status,
        string SubmittedAt,
        string? ReviewedAt,
        string? ReviewedBy,
        string? ReviewNote,
        string Type,
        string? OriginalCheckIn,
        string? OriginalCheckOut
    );
}
