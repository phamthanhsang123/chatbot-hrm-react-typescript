namespace Admin.DTOs
{
    public class AgenticAiRunRequestDto
    {
        public int ManagerId { get; set; }
        public int? EmployeeId { get; set; }
        public int? DepartmentId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public string Goal { get; set; } = "";
        public bool PersistReview { get; set; } = false;
    }

    public class AgenticAiWorkflowDto
    {
        public string RunId { get; set; } = "";
        public DateTime CreatedAt { get; set; }
        public string Goal { get; set; } = "";
        public int ManagerId { get; set; }
        public int? EmployeeId { get; set; }
        public int? DepartmentId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public int IterationCount { get; set; }
        public string CompletionStatus { get; set; } = "RUNNING";
        public List<int> PersistedReviewIds { get; set; } = new();
        public AgenticPlanDto Plan { get; set; } = new();
        public AgenticDataPackageDto Data { get; set; } = new();
        public AgenticAnalysisDto Analysis { get; set; } = new();
        public AgenticPolicyContextDto Policy { get; set; } = new();
        public AgenticRecommendationPackageDto Recommendation { get; set; } = new();
        public AgenticReflectionDto Reflection { get; set; } = new();
        public AgenticReportDto Report { get; set; } = new();
        public AgenticLlmStatusDto Llm { get; set; } = new();
        public List<AgenticTraceDto> Trace { get; set; } = new();
    }

    public class AgenticLlmStatusDto
    {
        public bool IsEnabled { get; set; }
        public bool IsConfigured { get; set; }
        public bool WasUsed { get; set; }
        public string Provider { get; set; } = "";
        public string Model { get; set; } = "";
        public string Mode { get; set; } = "RuleBased";
        public List<string> Notes { get; set; } = new();
    }

    public class AgenticTraceDto
    {
        public string Agent { get; set; } = "";
        public string Action { get; set; } = "";
        public string Result { get; set; } = "";
        public DateTime CreatedAt { get; set; }
    }

    public class AgenticPlanDto
    {
        public string Intent { get; set; } = "";
        public List<string> RequiredData { get; set; } = new();
        public List<string> RequiredTools { get; set; } = new();
        public List<string> SuccessCriteria { get; set; } = new();
        public List<AgenticPlanStepDto> Steps { get; set; } = new();
    }

    public class AgenticPlanStepDto
    {
        public int Order { get; set; }
        public string Agent { get; set; } = "";
        public string Action { get; set; } = "";
        public string Reason { get; set; } = "";
    }

    public class TargetEmployeeDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Role { get; set; } = "";
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public int? PositionId { get; set; }
        public string? PositionTitle { get; set; }
        public decimal? SalaryBase { get; set; }
        public string Status { get; set; } = "";
    }

    public class AgenticDataPackageDto
    {
        public string Scope { get; set; } = "";
        public List<TargetEmployeeDto> Employees { get; set; } = new();
        public List<CompetencyInputDataDto> CompetencyInputs { get; set; } = new();
        public List<string> MissingData { get; set; } = new();
        public List<string> ContextNotes { get; set; } = new();
    }

    public class AgenticAnalysisDto
    {
        public int TotalEmployees { get; set; }
        public int DecisionReadyEmployees { get; set; }
        public decimal AverageScore { get; set; }
        public List<AgenticEmployeeAnalysisDto> Employees { get; set; } = new();
        public List<string> DepartmentInsights { get; set; } = new();
    }

    public class AgenticEmployeeAnalysisDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public decimal AttendanceScore { get; set; }
        public decimal TaskPerformanceScore { get; set; }
        public decimal QualitySkillScore { get; set; }
        public decimal DisciplineResponsibilityScore { get; set; }
        public decimal TotalScore { get; set; }
        public string Rating { get; set; } = "";
        public string RiskLevel { get; set; } = "";
        public decimal DataCompletenessPercent { get; set; }
        public string ConfidenceLevel { get; set; } = "";
        public bool IsDecisionReady { get; set; }
        public List<string> AvailableEvidence { get; set; } = new();
        public List<string> MissingEvidence { get; set; } = new();
        public List<string> Findings { get; set; } = new();
        public List<string> RootCauses { get; set; } = new();
    }

    public class AgenticPolicyContextDto
    {
        public string Source { get; set; } = "";
        public List<AgenticPolicyRuleDto> Rules { get; set; } = new();
        public List<string> AppliedRules { get; set; } = new();
        public List<string> RagNotes { get; set; } = new();
    }

    public class AgenticPolicyRuleDto
    {
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public decimal Threshold { get; set; }
    }

    public class AgenticRecommendationPackageDto
    {
        public string OverallRecommendation { get; set; } = "";
        public List<AgenticRecommendationDto> Items { get; set; } = new();
    }

    public class AgenticRecommendationDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string Action { get; set; } = "";
        public string Priority { get; set; } = "";
        public string Reason { get; set; } = "";
        public string Evidence { get; set; } = "";
        public string PolicyReference { get; set; } = "";
    }

    public class AgenticReflectionDto
    {
        public bool IsValid { get; set; }
        public string ValidationStatus { get; set; } = "";
        public bool NeedsMoreData { get; set; }
        public bool NeedsPolicyReview { get; set; }
        public bool NeedsRecommendationRevision { get; set; }
        public List<string> Checks { get; set; } = new();
        public List<string> Issues { get; set; } = new();
        public List<string> NextActions { get; set; } = new();
    }

    public class AgenticReportDto
    {
        public string Title { get; set; } = "";
        public string Summary { get; set; } = "";
        public Dictionary<string, decimal> DashboardMetrics { get; set; } = new();
        public List<string> Highlights { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public DateTime GeneratedAt { get; set; }
        public string ExportStatus { get; set; } = "";
    }
}
