using Admin.Models;
using Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Admin.Controllers
{
    [Authorize(Roles = "EMPLOYEE,MANAGER,ADMIN")]
    [ApiController]
    [Route("api/employee/leave-requests")]
    public class EmployeeLeaveController : ControllerBase
    {
        private readonly LeaveRequestService _service;

        public EmployeeLeaveController(LeaveRequestService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetMine([FromQuery] int employeeId)
        {
            var resolvedEmployeeId = ResolveEmployeeId(employeeId);
            if (!resolvedEmployeeId.HasValue)
            {
                return Forbid();
            }

            return Ok(_service.GetAll(null, resolvedEmployeeId.Value));
        }

        [HttpPost]
        public IActionResult Create([FromBody] LeaveRequestCreateDto dto)
        {
            var resolvedEmployeeId = ResolveEmployeeId(dto.EmployeeId);
            if (!resolvedEmployeeId.HasValue)
            {
                return Forbid();
            }

            dto.EmployeeId = resolvedEmployeeId.Value;

            try
            {
                return Ok(_service.Create(dto));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private int? ResolveEmployeeId(int requestedEmployeeId)
        {
            var claim = User.FindFirstValue("employee_id");
            if (!int.TryParse(claim, out var actorId))
            {
                return null;
            }

            if (User.IsInRole("ADMIN") || User.IsInRole("MANAGER"))
            {
                return requestedEmployeeId > 0 ? requestedEmployeeId : actorId;
            }

            return requestedEmployeeId == actorId ? actorId : null;
        }
    }
}
