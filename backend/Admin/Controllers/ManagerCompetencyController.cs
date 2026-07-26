using Admin.DTOs;
using Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [ApiController]
    [Route("api/manager/competency")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public class ManagerCompetencyController : ControllerBase
    {
        private readonly AgenticCompetencyService _service;

        public ManagerCompetencyController(AgenticCompetencyService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetReviews([FromQuery] int managerId, [FromQuery] int? month, [FromQuery] int? year)
        {
            try
            {
                var now = DateTime.Now;
                managerId = GetActorEmployeeId();
                return Ok(await _service.GetManagerReviews(managerId, month ?? now.Month, year ?? now.Year));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{employeeId:int}/input-data")]
        public async Task<IActionResult> GetInputData(
            int employeeId,
            [FromQuery] int managerId,
            [FromQuery] int? month,
            [FromQuery] int? year)
        {
            try
            {
                var now = DateTime.Now;
                managerId = GetActorEmployeeId();
                return Ok(await _service.GetInputData(managerId, employeeId, month ?? now.Month, year ?? now.Year));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{reviewId:int}/approve")]
        public async Task<IActionResult> Approve(int reviewId, [FromQuery] int managerId, [FromBody] ReviewDecisionDto dto)
        {
            try
            {
                managerId = GetActorEmployeeId();
                var review = await _service.ApproveReview(managerId, reviewId, dto.ManagerNote);
                return review == null ? NotFound(new { message = "Review not found" }) : Ok(review);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{reviewId:int}/reject")]
        public async Task<IActionResult> Reject(int reviewId, [FromQuery] int managerId, [FromBody] ReviewDecisionDto dto)
        {
            try
            {
                managerId = GetActorEmployeeId();
                var review = await _service.RejectReview(managerId, reviewId, dto.ManagerNote);
                return review == null ? NotFound(new { message = "Review not found" }) : Ok(review);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private int GetActorEmployeeId()
        {
            var employeeIdClaim = User.FindFirst("employee_id")?.Value;
            if (!int.TryParse(employeeIdClaim, out var employeeId) || employeeId <= 0)
            {
                throw new InvalidOperationException("JWT không có định danh nhân viên hợp lệ.");
            }

            return employeeId;
        }
    }
}
