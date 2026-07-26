namespace Admin.DTOs
{
    public class CreateAttendanceRequestDto
    {
        public int EmployeeId { get; set; }
        public string WorkDate { get; set; } = "";
        public string RequestType { get; set; } = "SUPPLEMENT";
        public string RequestedCheckIn { get; set; } = "";
        public string RequestedCheckOut { get; set; } = "";
        public string Reason { get; set; } = "";
        public string? WorkReportTitle { get; set; }
        public string? WorkReportDescription { get; set; }
    }

    public class AttendanceRequestResponseDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeCode => $"NV{EmployeeId:D3}";
        public string EmployeeName { get; set; } = "";
        public int? DepartmentId { get; set; }
        public string Department { get; set; } = "";
        public DateTime WorkDate { get; set; }
        public string RequestType { get; set; } = "";
        public DateTime? RequestedCheckIn { get; set; }
        public DateTime? RequestedCheckOut { get; set; }
        public DateTime? OriginalCheckIn { get; set; }
        public DateTime? OriginalCheckOut { get; set; }
        public string Reason { get; set; } = "";
        public string? WorkReportTitle { get; set; }
        public string? WorkReportDescription { get; set; }
        public string Status { get; set; } = "";
        public DateTime SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public int? ReviewedById { get; set; }
        public string? ReviewedBy { get; set; }
        public string? ReviewNote { get; set; }
    }

    public class AttendanceReviewDto
    {
        public string? Note { get; set; }
    }
}
