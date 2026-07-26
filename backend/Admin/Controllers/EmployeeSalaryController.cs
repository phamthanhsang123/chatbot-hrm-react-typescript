using Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Admin.Controllers
{
    [Authorize(Roles = "EMPLOYEE,MANAGER,ADMIN")]
    [ApiController]
    [Route("api/employee/salary")]
    public class EmployeeSalaryController : ControllerBase
    {
        private readonly SalaryService _service;

        public EmployeeSalaryController(SalaryService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetMine(
            [FromQuery] int employeeId,
            [FromQuery] int month,
            [FromQuery] int year)
        {
            if (month is < 1 or > 12 || year < 2000)
            {
                return BadRequest(new { message = "Tháng/năm không hợp lệ." });
            }

            var actorClaim = User.FindFirstValue("employee_id");
            if (!int.TryParse(actorClaim, out var actorId))
            {
                return Forbid();
            }

            if (User.IsInRole("EMPLOYEE") && employeeId != actorId)
            {
                return Forbid();
            }

            return Ok(_service.GetByEmployee(employeeId, month, year));
        }
    }
}
