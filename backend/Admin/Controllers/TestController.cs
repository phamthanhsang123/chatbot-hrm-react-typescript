using Admin.Data;
using Admin.Services;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [ApiController]
    [Route("api/test")]
    public class TestController : ControllerBase
    {
        private readonly AppDbContext _db;

        public TestController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("mysql")]
        public IActionResult TestMySql()
        {
            return Ok(new
            {
                employees = _db.Employees.Count(),
                departments = _db.Departments.Count(),
                positions = _db.Positions.Count(),
                payrolls = _db.Payrolls.Count(),
                attendances = _db.Attendances.Count(),
                leaveRequests = _db.LeaveRequests.Count(),
                tasks = _db.Tasks.Count(),
                competencyReviews = _db.CompetencyReviews.Count()
            });
        }

    }
}
