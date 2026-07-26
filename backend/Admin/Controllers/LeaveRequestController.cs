using Admin.Models;
using Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [Authorize(Roles = "ADMIN,HR")]
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
            if (!_service.Approve(id)) return NotFound();
            return Ok();
        }

        [HttpPost("{id}/reject")]
        public IActionResult Reject(int id)
        {
            if (!_service.Reject(id)) return NotFound();
            return Ok();
        }

        [HttpGet("dashboard")]
        public IActionResult Dashboard()
        {
            return Ok(_service.Dashboard());
        }
    }
}
