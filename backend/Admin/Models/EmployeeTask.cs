using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Admin.Models
{
    [Table("tasks")]
    public class EmployeeTask
    {
        [Key]
        [Column("task_id")]
        public int Id { get; set; }

        [Column("employee_id")]
        public int EmployeeId { get; set; }

        [Column("manager_id")]
        public int ManagerId { get; set; }

        [Column("department_id")]
        public int? DepartmentId { get; set; }

        [Column("title")]
        public string Title { get; set; } = "";

        [Column("description")]
        public string? Description { get; set; }

        [Column("deadline")]
        public DateTime Deadline { get; set; }

        [Column("priority")]
        public string Priority { get; set; } = "MEDIUM";

        [Column("status")]
        public string Status { get; set; } = "NEW";

        [Column("progress_percent")]
        public int ProgressPercent { get; set; }

        [Column("expected_score", TypeName = "decimal(5,2)")]
        public decimal ExpectedScore { get; set; } = 100;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        public Employee? Employee { get; set; }
        public Employee? Manager { get; set; }
        public Department? Department { get; set; }
        public ICollection<TaskProgressLog> ProgressLogs { get; set; } = new List<TaskProgressLog>();
        public ICollection<TaskReview> Reviews { get; set; } = new List<TaskReview>();
    }
}
