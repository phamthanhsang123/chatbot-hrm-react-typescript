using Admin.DTOs;
using Admin.Models;
using Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Admin.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/admin/attendance")]
    public class AttendanceController : ControllerBase
    {
        private readonly AttendanceService _service;

        public AttendanceController(AttendanceService service)
        {
            _service = service;
        }

        [HttpGet("requests")]
        public async Task<IActionResult> GetRequests([FromQuery] string? status)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            return Ok(await _service.GetRequestsAsync(actor, status));
        }

        [HttpPost("requests")]
        public async Task<IActionResult> CreateRequest([FromBody] CreateAttendanceRequestDto dto)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                var result = await _service.CreateRequestAsync(actor, dto);
                return CreatedAtAction(nameof(GetRequests), new { status = result.Status }, result);
            }
            catch (UnauthorizedAccessException exception)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpPost("requests/{id:int}/approve")]
        public Task<IActionResult> ApproveRequest(int id, [FromBody] AttendanceReviewDto? dto)
        {
            return ReviewRequestAsync(id, true, dto?.Note);
        }

        [HttpPost("requests/{id:int}/reject")]
        public Task<IActionResult> RejectRequest(int id, [FromBody] AttendanceReviewDto? dto)
        {
            return ReviewRequestAsync(id, false, dto?.Note);
        }

        [HttpPost("checkin/{employeeId:int}")]
        public async Task<IActionResult> CheckIn(int employeeId)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                return Ok(await _service.CheckInAsync(actor, employeeId));
            }
            catch (UnauthorizedAccessException exception)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = exception.Message });
            }
        }

        [HttpPost("checkout/{employeeId:int}")]
        public async Task<IActionResult> CheckOut(int employeeId, [FromBody] AttendanceCheckOutDto? dto)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                var result = await _service.CheckOutAsync(actor, employeeId, dto);
                return result == null
                    ? BadRequest(new { message = "Chưa check-in hoặc đã check-out." })
                    : Ok(result);
            }
            catch (UnauthorizedAccessException exception)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = exception.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetByDate([FromQuery] string? date)
        {
            if (string.IsNullOrWhiteSpace(date) || !DateTime.TryParse(date, out var parsedDate))
            {
                return BadRequest(new { message = "Ngày chấm công không hợp lệ." });
            }

            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });
            return Ok(await _service.GetByDateAsync(parsedDate, actor));
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] string? date)
        {
            if (string.IsNullOrWhiteSpace(date) || !DateTime.TryParse(date, out var parsedDate))
            {
                return BadRequest(new { message = "Ngày chấm công không hợp lệ." });
            }

            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });
            return Ok(await _service.GetSummaryAsync(parsedDate, actor));
        }

        [HttpGet("report")]
        public async Task<IActionResult> MonthlyReport([FromQuery] int year, [FromQuery] int month)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                return Ok(await _service.GetMonthlyReportAsync(year, month, actor));
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpGet("records")]
        public async Task<IActionResult> MonthlyRecords([FromQuery] int year, [FromQuery] int month)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                return Ok(await _service.GetMonthlyRecordsAsync(year, month, actor));
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpGet("shifts")]
        public async Task<IActionResult> GetShifts(
            [FromQuery] int year,
            [FromQuery] int month,
            [FromQuery] int? employeeId)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                return Ok(await _service.GetShiftsAsync(actor, year, month, employeeId));
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpPut("records/{id:int}/report")]
        public async Task<IActionResult> UpdateWorkReport(
            int id,
            [FromBody] AttendanceWorkReportDto dto)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                return Ok(await _service.UpdateWorkReportAsync(actor, id, dto));
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (UnauthorizedAccessException exception)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpPost("shifts")]
        public async Task<IActionResult> CreateShift([FromBody] SaveAttendanceShiftDto dto)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                return Ok(await _service.CreateShiftAsync(actor, dto));
            }
            catch (UnauthorizedAccessException exception)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpPut("shifts/{id:int}")]
        public async Task<IActionResult> UpdateShift(int id, [FromBody] SaveAttendanceShiftDto dto)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                return Ok(await _service.UpdateShiftAsync(actor, id, dto));
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (UnauthorizedAccessException exception)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpDelete("shifts/{id:int}")]
        public async Task<IActionResult> DeleteShift(int id)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                await _service.DeleteShiftAsync(actor, id);
                return NoContent();
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (UnauthorizedAccessException exception)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        private async Task<IActionResult> ReviewRequestAsync(int id, bool approve, string? note)
        {
            var actor = await GetActorAsync();
            if (actor == null) return Unauthorized(new { message = "Tài khoản đăng nhập không còn tồn tại." });

            try
            {
                return Ok(await _service.ReviewRequestAsync(actor, id, approve, note));
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (UnauthorizedAccessException exception)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        private async Task<Employee?> GetActorAsync()
        {
            var email = User.FindFirstValue(ClaimTypes.Name);
            return string.IsNullOrWhiteSpace(email) ? null : await _service.GetActorAsync(email);
        }
    }
}
