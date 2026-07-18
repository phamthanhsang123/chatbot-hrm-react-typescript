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
        private readonly DemoDataSeeder _seeder;

        public TestController(AppDbContext db, DemoDataSeeder seeder)
        {
            _db = db;
            _seeder = seeder;
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

        [HttpPost("seed-demo")]
        public async Task<IActionResult> SeedDemo()
        {
            var result = await _seeder.SeedAsync();
            return Ok(result);
        }
    }
}
