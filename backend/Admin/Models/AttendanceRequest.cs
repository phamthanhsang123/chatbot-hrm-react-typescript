using System.ComponentModel.DataAnnotations.Schema;

namespace Admin.Models
{
    [Table("attendance_requests")]
    public class AttendanceRequest
    {
        [Column("request_id")]
        public int Id { get; set; }

        [Column("employee_id")]
        public int EmployeeId { get; set; }

        [Column("work_date")]
        public DateTime WorkDate { get; set; }

        [Column("request_type")]
        public string RequestType { get; set; } = "SUPPLEMENT";

        [Column("requested_check_in")]
        public DateTime? RequestedCheckIn { get; set; }

        [Column("requested_check_out")]
        public DateTime? RequestedCheckOut { get; set; }

        [Column("original_check_in")]
        public DateTime? OriginalCheckIn { get; set; }

        [Column("original_check_out")]
        public DateTime? OriginalCheckOut { get; set; }

        [Column("reason")]
        public string Reason { get; set; } = "";

        [Column("work_report_title")]
        public string? WorkReportTitle { get; set; }

        [Column("work_report_description")]
        public string? WorkReportDescription { get; set; }

        [Column("status")]
        public string Status { get; set; } = "PENDING";

        [Column("reviewed_by")]
        public int? ReviewedById { get; set; }

        [Column("review_note")]
        public string? ReviewNote { get; set; }

        [Column("submitted_at")]
        public DateTime SubmittedAt { get; set; }

        [Column("reviewed_at")]
        public DateTime? ReviewedAt { get; set; }

        public Employee Employee { get; set; } = null!;
        public Employee? Reviewer { get; set; }
    }
}
