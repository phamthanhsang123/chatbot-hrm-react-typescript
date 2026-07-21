using Admin.Data;
using Admin.DTOs;
using Admin.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Admin.Services
{
    public class AuthService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public AuthService(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        // LOGIN (BY EMAIL)
        public LoginResultDto Login(string email, string password)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
                throw new Exception("Thiếu email hoặc mật khẩu");

            var normalizedEmail = email.Trim().ToLower();

            var emp = _db.Employees
                .AsNoTracking()
                .Where(e => e.Email.ToLower() == normalizedEmail)
                .Select(e => new
                {
                    Employee = new Employee
                    {
                        Id = e.Id,
                        Email = e.Email,
                        Password = e.Password,
                        Role = e.Role,
                        FullName = e.FullName,
                        DepartmentId = e.DepartmentId,
                        Status = e.Status
                    },
                    DepartmentName = e.Department != null ? e.Department.Name : null
                })
                .FirstOrDefault();

            if (emp == null)
                throw new Exception("Tài khoản không tồn tại");

            if (string.IsNullOrWhiteSpace(emp.Employee.Password))
                throw new Exception("Tài khoản chưa có mật khẩu hợp lệ");

            if (!BCrypt.Net.BCrypt.Verify(password, emp.Employee.Password))
                throw new Exception("Mật khẩu không đúng");

            return new LoginResultDto
            {
                Token = GenerateJwtToken(emp.Employee),
                Role = emp.Employee.Role ?? "EMPLOYEE",
                EmployeeId = emp.Employee.Id,
                Email = emp.Employee.Email,
                FullName = emp.Employee.FullName,
                DepartmentId = emp.Employee.DepartmentId,
                DepartmentName = emp.DepartmentName,
                Status = emp.Employee.Status
            };
        }

        // RESET PASSWORD
        public void ResetPasswordByEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Thiếu email");

            var emp = _db.Employees.FirstOrDefault(e => e.Email == email);
            if (emp == null)
                throw new Exception("Không tìm thấy nhân viên");

            emp.Password = BCrypt.Net.BCrypt.HashPassword("123456");
            _db.SaveChanges();
        }

        // JWT TOKEN
        private string GenerateJwtToken(Employee emp)
        {
            var jwtKey = _config["Jwt:Key"] ?? "LOCAL_DEV_SECRET_KEY_FOR_HRM_ADMIN_API_32_CHARS";
            var jwtIssuer = _config["Jwt:Issuer"] ?? "HRM.Admin.API";

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, emp.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.Name, emp.Email),
                new Claim(ClaimTypes.Role, emp.Role ?? "EMPLOYEE")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtIssuer,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(3),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
