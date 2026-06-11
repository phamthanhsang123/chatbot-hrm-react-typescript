using Admin.DTOs;
using Admin.Services;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [ApiController]
    [Route("api/manager/tasks")]
    public class ManagerTasksController : ControllerBase
    {
        private readonly TaskService _service;

        public ManagerTasksController(TaskService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int managerId)
        {
            try
            {
                return Ok(await _service.GetManagerTasks(managerId));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var task = await _service.GetById(id);
            return task == null ? NotFound(new { message = "Task not found" }) : Ok(task);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromQuery] int managerId, [FromBody] CreateTaskDto dto)
        {
            try
            {
                return Ok(await _service.Create(managerId, dto));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromQuery] int managerId, [FromBody] UpdateTaskDto dto)
        {
            try
            {
                var task = await _service.Update(managerId, id, dto);
                return task == null ? NotFound(new { message = "Task not found" }) : Ok(task);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/review")]
        public async Task<IActionResult> Review(int id, [FromQuery] int managerId, [FromBody] ReviewTaskDto dto)
        {
            try
            {
                var task = await _service.Review(managerId, id, dto);
                return task == null ? NotFound(new { message = "Task not found" }) : Ok(task);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
