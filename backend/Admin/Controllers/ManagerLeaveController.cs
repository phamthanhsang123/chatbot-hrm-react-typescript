using Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Admin.Controllers
{
    [Authorize(Roles = "MANAGER,ADMIN")]
    [ApiController]
    [Route("api/manager/leave-requests")]
    public class ManagerLeaveController : ControllerBase
    {
        private readonly LeaveRequestService _service;

        public ManagerLeaveController(LeaveRequestService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetTeam([FromQuery] string? status)
        {
            var departmentId = ResolveDepartmentScope();
            if (!User.IsInRole("ADMIN") && !departmentId.HasValue)
            {
                return Forbid();
            }

            return Ok(_service.GetAll(status, departmentId: departmentId));
        }

        [HttpGet("dashboard")]
        public IActionResult Dashboard()
        {
            var departmentId = ResolveDepartmentScope();
            if (!User.IsInRole("ADMIN") && !departmentId.HasValue)
            {
                return Forbid();
            }

            return Ok(_service.Dashboard(departmentId));
        }

        [HttpPost("{id}/approve")]
        public IActionResult Approve(int id)
        {
            var departmentId = ResolveDepartmentScope();
            if (!_service.Approve(id, departmentId))
            {
                return BadRequest(new { message = "Không thể duyệt đơn nghỉ phép này." });
            }

            return NoContent();
        }

        [HttpPost("{id}/reject")]
        public IActionResult Reject(int id)
        {
            var departmentId = ResolveDepartmentScope();
            if (!_service.Reject(id, departmentId))
            {
                return BadRequest(new { message = "Không thể từ chối đơn nghỉ phép này." });
            }

            return NoContent();
        }

        private int? ResolveDepartmentScope()
        {
            if (User.IsInRole("ADMIN"))
            {
                return null;
            }

            var claim = User.FindFirstValue("employee_id");
            return int.TryParse(claim, out var managerId)
                ? _service.GetDepartmentId(managerId)
                : null;
        }
    }
}
