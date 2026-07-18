using Admin.Services;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
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
        public IActionResult GetByEmployee([FromQuery] int employeeId, [FromQuery] int month, [FromQuery] int year)
        {
            if (employeeId <= 0)
            {
                return BadRequest(new { message = "Thiếu employeeId" });
            }

            if (month < 1 || month > 12 || year < 2000)
            {
                return BadRequest(new { message = "Tháng/năm không hợp lệ" });
            }

            return Ok(_service.GetByEmployee(employeeId, month, year));
        }
    }
}
