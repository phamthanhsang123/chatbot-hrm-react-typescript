using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Admin.Models
{
    [Table("task_progress_logs")]
    public class TaskProgressLog
    {
        [Key]
        [Column("progress_id")]
        public int Id { get; set; }

        [Column("task_id")]
        public int TaskId { get; set; }

        [Column("employee_id")]
        public int EmployeeId { get; set; }

        [Column("progress_percent")]
        public int ProgressPercent { get; set; }

        [Column("note")]
        public string? Note { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        public EmployeeTask? Task { get; set; }
        public Employee? Employee { get; set; }
    }
}
