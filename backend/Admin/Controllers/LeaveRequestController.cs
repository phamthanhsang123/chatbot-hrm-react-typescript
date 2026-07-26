using Admin.Models;
using Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [ApiController]
    [Route("api/admin/leave-requests")]

    public class LeaveRequestController : ControllerBase
    {
        private readonly LeaveRequestService _service;

        public LeaveRequestController(LeaveRequestService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] string? status)
        {
            return Ok(_service.GetAll(status));
        }

        [HttpPost]
        public IActionResult Create([FromBody] LeaveRequestCreateDto dto)
        {
            try
            {
                return Ok(_service.Create(dto));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/approve")]
        public IActionResult Approve(int id)
        {
            try
            {
                var updated = _service.Approve(id);
                return updated == null ? NotFound(new { message = "Không tìm thấy đơn nghỉ phép" }) : Ok(updated);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/reject")]
        public IActionResult Reject(int id)
        {
            try
            {
                var updated = _service.Reject(id);
                return updated == null ? NotFound(new { message = "Không tìm thấy đơn nghỉ phép" }) : Ok(updated);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("dashboard")]
        public IActionResult Dashboard()
        {
            return Ok(_service.Dashboard());
        }
    }
}
