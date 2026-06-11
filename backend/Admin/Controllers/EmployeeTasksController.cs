using Admin.DTOs;
using Admin.Services;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [ApiController]
    [Route("api/employee/tasks")]
    public class EmployeeTasksController : ControllerBase
    {
        private readonly TaskService _service;

        public EmployeeTasksController(TaskService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetMine([FromQuery] int employeeId)
        {
            try
            {
                return Ok(await _service.GetEmployeeTasks(employeeId));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}/progress")]
        public async Task<IActionResult> UpdateProgress(int id, [FromQuery] int employeeId, [FromBody] UpdateTaskProgressDto dto)
        {
            try
            {
                var task = await _service.UpdateProgress(employeeId, id, dto);
                return task == null ? NotFound(new { message = "Task not found" }) : Ok(task);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/submit")]
        public async Task<IActionResult> Submit(int id, [FromQuery] int employeeId)
        {
            try
            {
                var task = await _service.Submit(employeeId, id);
                return task == null ? NotFound(new { message = "Task not found" }) : Ok(task);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
