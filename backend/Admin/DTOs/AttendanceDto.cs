namespace Admin.DTOs
{
    public class AttendanceDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string Department { get; set; } = "";
        public DateTime Date { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public decimal TotalHours { get; set; }
        public bool IsLate { get; set; }
        public bool IsEarlyLeave { get; set; }
        public string Note { get; set; } = "";
        public string Status { get; set; } = "";
        public string? WorkReportTitle { get; set; }
        public string? WorkReportDescription { get; set; }
        public string? WorkReportNote { get; set; }
    }

    public class AttendanceCheckOutDto
    {
        public string? WorkReportTitle { get; set; }
        public string? WorkReportDescription { get; set; }
        public string? WorkReportNote { get; set; }
    }

    public class AttendanceWorkReportDto
    {
        public string? WorkReportTitle { get; set; }
        public string? WorkReportDescription { get; set; }
        public string? WorkReportNote { get; set; }
    }

    public class SaveAttendanceShiftDto
    {
        public int EmployeeId { get; set; }
        public string WorkDate { get; set; } = "";
        public string StartTime { get; set; } = "";
        public string EndTime { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Description { get; set; }
    }

    public class AttendanceShiftResponseDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public DateTime WorkDate { get; set; }
        public string StartTime { get; set; } = "";
        public string EndTime { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public string Status { get; set; } = "";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
