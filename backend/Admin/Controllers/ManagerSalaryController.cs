using Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Admin.Controllers
{
    [Authorize(Roles = "MANAGER,ADMIN")]
    [ApiController]
    [Route("api/manager/salary")]
    public class ManagerSalaryController : ControllerBase
    {
        private readonly SalaryService _service;

        public ManagerSalaryController(SalaryService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetTeam(
            [FromQuery] int managerId,
            [FromQuery] int month,
            [FromQuery] int year,
            [FromQuery] string? status)
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

            if (!User.IsInRole("ADMIN") && managerId != actorId)
            {
                return Forbid();
            }

            return Ok(_service.GetByManager(managerId, month, year, status));
        }

        [HttpGet("dashboard")]
        public IActionResult Dashboard(
            [FromQuery] int managerId,
            [FromQuery] int month,
            [FromQuery] int year)
        {
            var actorClaim = User.FindFirstValue("employee_id");
            if (!int.TryParse(actorClaim, out var actorId))
            {
                return Forbid();
            }

            if (!User.IsInRole("ADMIN") && managerId != actorId)
            {
                return Forbid();
            }

            var rows = _service.GetByManager(managerId, month, year, null);

            return Ok(new
            {
                totalGross = rows.Sum(x => x.TotalIncome),
                totalNet = rows.Sum(x => x.NetPay),
                avgNet = rows.Count > 0 ? rows.Average(x => x.NetPay) : 0,
                totalDeduction = rows.Sum(x => x.TotalDeduction),
                pending = rows.Count(x => x.Status != "Đã thanh toán"),
                count = rows.Count
            });
        }
    }
}
