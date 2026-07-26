using Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [Authorize(Roles = "ADMIN,HR")]
    [ApiController]
    [Route("api/admin/salary")]
    public class SalaryController : ControllerBase
    {
        private readonly SalaryService _service;

        public SalaryController(SalaryService service)
        {
            _service = service;
        }

        [HttpGet("dashboard")]
        public IActionResult Dashboard(int month, int year)
        {
            return Ok(_service.Dashboard(month, year));
        }

        [HttpGet]
        public IActionResult GetAll(int month, int year, string? status)
        {
            return Ok(_service.GetAll(month, year, status));
        }

        [HttpPost("calculate")]
        public IActionResult Calculate(int month, int year)
        {
            var count = _service.CalculateMonthly(month, year);
            return Ok(new { message = $"Đã tính lương cho {count} nhân viên" });
        }

        [HttpPost("{id}/approve")]
        public IActionResult Approve(int id)
        {
            if (!_service.Approve(id))
                return BadRequest(new { message = "Không thể duyệt bảng lương ở trạng thái hiện tại." });

            return Ok(new { message = "Đã duyệt bảng lương." });
        }

        [HttpPost("{id}/pay")]
        public IActionResult Pay(int id)
        {
            if (!_service.Pay(id))
                return BadRequest(new { message = "Không thể thanh toán bảng lương ở trạng thái hiện tại." });

            return Ok(new { message = "Đã thanh toán bảng lương." });
        }
    }
}
