using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Admin.Models
{
    [Table("leave_requests")]
    public class LeaveRequest
    {
        [Key]
        [Column("leave_id")]
        public int Id { get; set; }

        [Column("employee_id")]
        public int EmployeeId { get; set; }

        [Column("leave_type_id")]
        public int LeaveTypeId { get; set; }

        [Column("start_date")]
        public DateTime StartDate { get; set; }

        [Column("end_date")]
        public DateTime EndDate { get; set; }

        [Column("total_days")]
        public int TotalDays { get; set; }

        [Column("reason")]
        public string Reason { get; set; } = "";

        [Column("status")]
        public string Status { get; set; } = "Chờ duyệt";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
