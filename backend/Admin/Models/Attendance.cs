using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Admin.Models
{
    [Table("attendance")]
    public class Attendance
    {
        [Key]
        public int Id { get; set; }

        [Column("employee_id")]
        public int EmployeeId { get; set; }

        [Column("date")]
        public DateTime Date { get; set; }

        [Column("check_in_time")]
        public TimeSpan? CheckInTime { get; set; }

        [Column("check_out_time")]
        public TimeSpan? CheckOutTime { get; set; }

        [Column("work_report_title")]
        public string? WorkReportTitle { get; set; }

        [Column("work_report_description")]
        public string? WorkReportDescription { get; set; }

        [Column("work_report_note")]
        public string? WorkReportNote { get; set; }

        [Column("total_hours")]
        public decimal TotalHours { get; set; }

        [Column("is_late")]
        public bool IsLate { get; set; }

        [Column("is_early_leave")]
        public bool IsEarlyLeave { get; set; }

        [Column("note")]
        public string Note { get; set; } = "";

        [Column("status")]
        public string Status { get; set; } = "";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
}
