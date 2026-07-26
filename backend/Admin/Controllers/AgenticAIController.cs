using Admin.DTOs;
using Admin.Services.Agentic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [ApiController]
    [Route("api/manager/agentic-ai")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public class AgenticAIController : ControllerBase
    {
        private readonly HRAIOrchestrator _orchestrator;
        private readonly AgenticQueryService _queryService;

        public AgenticAIController(HRAIOrchestrator orchestrator, AgenticQueryService queryService)
        {
            _orchestrator = orchestrator;
            _queryService = queryService;
        }

        [HttpPost("query")]
        public async Task<IActionResult> Query([FromBody] AgenticAiQueryRequestDto request)
        {
            try
            {
                request.ManagerId = GetActorEmployeeId();
                return Ok(await _queryService.QueryAsync(request));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("status")]
        public IActionResult Status([FromServices] AgenticLlmService llmService)
        {
            return Ok(new
            {
                service = "HR Agentic AI",
                status = "ready",
                llm = llmService.GetStatus()
            });
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> Analyze([FromBody] AgenticAiRunRequestDto request)
        {
            try
            {
                request.ManagerId = GetActorEmployeeId();
                var result = await _orchestrator.RunAsync(request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("employee/{employeeId:int}")]
        public async Task<IActionResult> AnalyzeEmployee(
            int employeeId,
            [FromQuery] int? month,
            [FromQuery] int? year,
            [FromQuery] bool persistReview = false)
        {
            try
            {
                var now = DateTime.Now;
                var request = new AgenticAiRunRequestDto
                {
                    ManagerId = GetActorEmployeeId(),
                    EmployeeId = employeeId,
                    Month = month ?? now.Month,
                    Year = year ?? now.Year,
                    Goal = "Evaluate one employee competency and recommend manager actions.",
                    PersistReview = persistReview
                };

                var result = await _orchestrator.RunAsync(request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        private int GetActorEmployeeId()
        {
            var employeeIdClaim = User.FindFirst("employee_id")?.Value;
            if (!int.TryParse(employeeIdClaim, out var employeeId) || employeeId <= 0)
            {
                throw new InvalidOperationException("JWT không có định danh nhân viên hợp lệ.");
            }

            return employeeId;
        }
    }
}
