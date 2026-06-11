namespace Admin.DTOs
{
    public class GenerateCompetencyReviewDto
    {
        public int Month { get; set; }
        public int Year { get; set; }
    }

    public class CompetencyInputDataDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string? PositionTitle { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public int TotalTasks { get; set; }
        public int ApprovedTasks { get; set; }
        public int RejectedTasks { get; set; }
        public int RevisionTasks { get; set; }
        public int OverdueTasks { get; set; }
        public decimal AverageProgress { get; set; }
        public decimal AverageQualityScore { get; set; }
        public decimal AverageDeadlineScore { get; set; }
        public int ProgressUpdateCount { get; set; }
        public int AttendanceDays { get; set; }
        public int LateDays { get; set; }
        public int EarlyLeaveDays { get; set; }
        public int IncompleteAttendanceDays { get; set; }
        public int ApprovedLeaveDays { get; set; }
        public List<TaskDto> Tasks { get; set; } = new();
    }

    public class AgenticCompetencyReviewDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public int? ManagerId { get; set; }
        public string? ManagerName { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal AttendanceScore { get; set; }
        public decimal TaskPerformanceScore { get; set; }
        public decimal QualitySkillScore { get; set; }
        public decimal DisciplineResponsibilityScore { get; set; }
        public decimal TotalScore { get; set; }
        public string Rating { get; set; } = "";
        public string? AiSummary { get; set; }
        public string? AiRecommendation { get; set; }
        public string? ManagerNote { get; set; }
        public string Status { get; set; } = "";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ReviewDecisionDto
    {
        public string? ManagerNote { get; set; }
    }
}
