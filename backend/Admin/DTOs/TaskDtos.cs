namespace Admin.DTOs
{
    public class CreateTaskDto
    {
        public int EmployeeId { get; set; }
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public DateTime Deadline { get; set; }
        public string Priority { get; set; } = "MEDIUM";
        public decimal ExpectedScore { get; set; } = 100;
    }

    public class UpdateTaskDto
    {
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public DateTime Deadline { get; set; }
        public string Priority { get; set; } = "MEDIUM";
        public decimal ExpectedScore { get; set; } = 100;
    }

    public class UpdateTaskProgressDto
    {
        public int ProgressPercent { get; set; }
        public string? Note { get; set; }
    }

    public class ReviewTaskDto
    {
        public decimal QualityScore { get; set; }
        public decimal DeadlineScore { get; set; }
        public string Decision { get; set; } = "APPROVED";
        public string? Comment { get; set; }
    }

    public class TaskDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public int ManagerId { get; set; }
        public string ManagerName { get; set; } = "";
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public DateTime Deadline { get; set; }
        public string Priority { get; set; } = "MEDIUM";
        public string Status { get; set; } = "NEW";
        public int ProgressPercent { get; set; }
        public decimal ExpectedScore { get; set; }
        public bool IsOverdue { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public TaskReviewDto? LatestReview { get; set; }
    }

    public class TaskProgressLogDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public int EmployeeId { get; set; }
        public int ProgressPercent { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class TaskReviewDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public int ManagerId { get; set; }
        public string ManagerName { get; set; } = "";
        public decimal QualityScore { get; set; }
        public decimal DeadlineScore { get; set; }
        public string Decision { get; set; } = "";
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
