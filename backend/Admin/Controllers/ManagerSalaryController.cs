using Admin.Services;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
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
        public IActionResult GetTeamSalary([FromQuery] int managerId, [FromQuery] int month, [FromQuery] int year, [FromQuery] string? status)
        {
            if (managerId <= 0)
            {
                return BadRequest(new { message = "Thiếu managerId" });
            }

            if (month < 1 || month > 12 || year < 2000)
            {
                return BadRequest(new { message = "Tháng/năm không hợp lệ" });
            }

            return Ok(_service.GetByManager(managerId, month, year, status));
        }

        [HttpGet("dashboard")]
        public IActionResult Dashboard([FromQuery] int managerId, [FromQuery] int month, [FromQuery] int year)
        {
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
