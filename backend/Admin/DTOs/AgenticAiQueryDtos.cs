namespace Admin.DTOs
{
    public class AgenticAiQueryRequestDto
    {
        public int ManagerId { get; set; }
        public string Question { get; set; } = "";
        public int Month { get; set; }
        public int Year { get; set; }
    }

    public class AgenticToolIntentDto
    {
        public bool IsSupported { get; set; }
        public string Tool { get; set; } = "";
        public string Metric { get; set; } = "";
        public string EmployeeName { get; set; } = "";
        public List<string> EmployeeNames { get; set; } = new();
    }

    public class AgenticGroundedAnswerDto
    {
        public string Answer { get; set; } = "";
        public int EmployeeId { get; set; }
        public List<int> EmployeeIds { get; set; } = new();
        public string Tool { get; set; } = "";
        public decimal PrimaryValue { get; set; }
        public decimal SecondaryValue { get; set; }
        public int RecordCount { get; set; }
    }

    public class AgenticAttendanceDayEvidenceDto
    {
        public DateTime Date { get; set; }
        public string CheckInTime { get; set; } = "";
        public string ExpectedStartTime { get; set; } = "";
        public int LateMinutes { get; set; }
    }

    public class AgenticAttendanceEvidenceDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string? DepartmentName { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public string Rule { get; set; } = "";
        public int AttendanceDays { get; set; }
        public int LateDays { get; set; }
        public List<AgenticAttendanceDayEvidenceDto> LateDates { get; set; } = new();
    }

    public class AgenticWorkHoursDayEvidenceDto
    {
        public DateTime Date { get; set; }
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public decimal WorkedHours { get; set; }
        public decimal OvertimeHours { get; set; }
        public bool IsLate { get; set; }
        public bool IsEarlyLeave { get; set; }
        public bool IsIncomplete { get; set; }
    }

    public class AgenticWorkHoursEvidenceDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string? DepartmentName { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public int AttendanceDays { get; set; }
        public int CompletedDays { get; set; }
        public int IncompleteDays { get; set; }
        public int LateDays { get; set; }
        public int EarlyLeaveDays { get; set; }
        public decimal TotalWorkedHours { get; set; }
        public decimal AverageWorkedHours { get; set; }
        public decimal ExpectedHours { get; set; }
        public decimal OvertimeHours { get; set; }
        public string Rule { get; set; } = "";
        public List<AgenticWorkHoursDayEvidenceDto> Days { get; set; } = new();
    }

    public class AgenticLeaveRequestEvidenceDto
    {
        public int LeaveId { get; set; }
        public string LeaveType { get; set; } = "";
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int DaysInPeriod { get; set; }
        public string Status { get; set; } = "";
    }

    public class AgenticLeaveEvidenceDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string? DepartmentName { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public int TotalRequests { get; set; }
        public int ApprovedRequests { get; set; }
        public int PendingRequests { get; set; }
        public int RejectedRequests { get; set; }
        public int ApprovedDays { get; set; }
        public int PendingDays { get; set; }
        public int RejectedDays { get; set; }
        public bool HasLeaveBalanceData { get; set; }
        public string Rule { get; set; } = "";
        public List<AgenticLeaveRequestEvidenceDto> Requests { get; set; } = new();
    }

    public class AgenticSalaryPeriodEvidenceDto
    {
        public int PayrollId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal GrossSalary { get; set; }
        public decimal Deductions { get; set; }
        public decimal NetSalary { get; set; }
        public string Status { get; set; } = "";
        public bool IsPaid { get; set; }
    }

    public class AgenticSalaryEvidenceDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string? DepartmentName { get; set; }
        public int TotalPeriods { get; set; }
        public int PaidPeriods { get; set; }
        public int PendingPeriods { get; set; }
        public decimal RecordedNetSalary { get; set; }
        public decimal PaidNetSalary { get; set; }
        public decimal PendingNetSalary { get; set; }
        public string Rule { get; set; } = "";
        public List<AgenticSalaryPeriodEvidenceDto> Periods { get; set; } = new();
    }

    public class AgenticTaskItemEvidenceDto
    {
        public int TaskId { get; set; }
        public string Title { get; set; } = "";
        public DateTime Deadline { get; set; }
        public string Priority { get; set; } = "";
        public string Status { get; set; } = "";
        public int ProgressPercent { get; set; }
        public bool IsOverdue { get; set; }
        public decimal? QualityScore { get; set; }
        public decimal? DeadlineScore { get; set; }
    }

    public class AgenticTaskEvidenceDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string? DepartmentName { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public int TotalTasks { get; set; }
        public int ApprovedTasks { get; set; }
        public int SubmittedTasks { get; set; }
        public int InProgressTasks { get; set; }
        public int RevisionTasks { get; set; }
        public int RejectedTasks { get; set; }
        public int OverdueTasks { get; set; }
        public decimal AverageProgress { get; set; }
        public decimal? AverageQualityScore { get; set; }
        public string Rule { get; set; } = "";
        public List<AgenticTaskItemEvidenceDto> Tasks { get; set; } = new();
    }

    public class AgenticAiQueryResponseDto
    {
        public string RunId { get; set; } = "";
        public DateTime CreatedAt { get; set; }
        public string Question { get; set; } = "";
        public string Answer { get; set; } = "";
        public AgenticToolIntentDto Intent { get; set; } = new();
        public AgenticAttendanceEvidenceDto? Evidence { get; set; }
        public AgenticWorkHoursEvidenceDto? WorkHoursEvidence { get; set; }
        public AgenticLeaveEvidenceDto? LeaveEvidence { get; set; }
        public AgenticSalaryEvidenceDto? SalaryEvidence { get; set; }
        public AgenticTaskEvidenceDto? TaskEvidence { get; set; }
        public List<AgenticAttendanceEvidenceDto> AttendanceEvidences { get; set; } = new();
        public List<AgenticWorkHoursEvidenceDto> WorkHoursEvidences { get; set; } = new();
        public List<AgenticLeaveEvidenceDto> LeaveEvidences { get; set; } = new();
        public List<AgenticSalaryEvidenceDto> SalaryEvidences { get; set; } = new();
        public List<AgenticTaskEvidenceDto> TaskEvidences { get; set; } = new();
        public AgenticLlmStatusDto Llm { get; set; } = new();
        public List<AgenticTraceDto> Trace { get; set; } = new();
    }
}
