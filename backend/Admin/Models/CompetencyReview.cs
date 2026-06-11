using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Admin.Models
{
    [Table("competency_reviews")]
    public class CompetencyReview
    {
        [Key]
        [Column("review_id")]
        public int Id { get; set; }

        [Column("employee_id")]
        public int EmployeeId { get; set; }

        [Column("manager_id")]
        public int? ManagerId { get; set; }

        [Column("department_id")]
        public int? DepartmentId { get; set; }

        [Column("review_month")]
        public int ReviewMonth { get; set; }

        [Column("review_year")]
        public int ReviewYear { get; set; }

        [Column("attendance_score", TypeName = "decimal(5,2)")]
        public decimal AttendanceScore { get; set; }

        [Column("task_performance_score", TypeName = "decimal(5,2)")]
        public decimal TaskPerformanceScore { get; set; }

        [Column("quality_skill_score", TypeName = "decimal(5,2)")]
        public decimal QualitySkillScore { get; set; }

        [Column("discipline_responsibility_score", TypeName = "decimal(5,2)")]
        public decimal DisciplineResponsibilityScore { get; set; }

        [Column("total_score", TypeName = "decimal(5,2)")]
        public decimal TotalScore { get; set; }

        [Column("rating")]
        public string Rating { get; set; } = "";

        [Column("ai_summary")]
        public string? AiSummary { get; set; }

        [Column("ai_recommendation")]
        public string? AiRecommendation { get; set; }

        [Column("manager_note")]
        public string? ManagerNote { get; set; }

        [Column("status")]
        public string Status { get; set; } = "DRAFT";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        public Employee? Employee { get; set; }
        public Employee? Manager { get; set; }
        public Department? Department { get; set; }
    }
}
