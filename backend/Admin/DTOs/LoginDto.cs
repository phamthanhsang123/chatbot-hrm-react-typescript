namespace Admin.DTOs
{
    public class LoginDto
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }

    public class LoginResultDto
    {
        public string Token { get; set; } = "";
        public string Role { get; set; } = "";
        public int EmployeeId { get; set; }
        public string Email { get; set; } = "";
        public string FullName { get; set; } = "";
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string Status { get; set; } = "";
    }
}
