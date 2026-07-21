using Admin.DTOs;
using Admin.Services;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers
{
    [ApiController]
    [Route("api/admin/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _auth;

        public AuthController(AuthService auth)
        {
            _auth = auth;
        }
        // LOGIN
        // =========================
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto dto)
        {
            try
            {
                var result = _auth.Login(dto.Username, dto.Password);

                return Ok(new
                {
                    success = true,
                    token = result.Token,
                    role = result.Role,
                    employeeId = result.EmployeeId,
                    email = result.Email,
                    fullName = result.FullName,
                    departmentId = result.DepartmentId,
                    departmentName = result.DepartmentName,
                    status = result.Status
                });
            }
            catch (Exception ex)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // FORGOT PASSWORD
        [HttpPost("forgot-password")]
        public IActionResult ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            try
            {
                _auth.ResetPasswordByEmail(dto.Email);
                return Ok(new
                {
                    success = true,
                    message = "Mật khẩu mới đã được reset về mặc định (123456)"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}
