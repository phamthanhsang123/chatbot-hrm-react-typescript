using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Admin.Models
{
    [Table("task_reviews")]
    public class TaskReview
    {
        [Key]
        [Column("review_id")]
        public int Id { get; set; }

        [Column("task_id")]
        public int TaskId { get; set; }

        [Column("manager_id")]
        public int ManagerId { get; set; }

        [Column("quality_score", TypeName = "decimal(5,2)")]
        public decimal QualityScore { get; set; }

        [Column("deadline_score", TypeName = "decimal(5,2)")]
        public decimal DeadlineScore { get; set; }

        [Column("decision")]
        public string Decision { get; set; } = "APPROVED";

        [Column("comment")]
        public string? Comment { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        public EmployeeTask? Task { get; set; }
        public Employee? Manager { get; set; }
    }
}
