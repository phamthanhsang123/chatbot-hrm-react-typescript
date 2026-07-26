namespace Admin.DTOs
{
    public class SalaryRowDto
    {
        public int Id { get; set; }

        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string EmployeeCode { get; set; } = "";

        public string Department { get; set; } = "";
        public string Position { get; set; } = "";

        public decimal SalaryBase { get; set; }
        public decimal Bonus { get; set; }
        public decimal Allowance { get; set; }
        public decimal OvertimePay { get; set; }
        public decimal SalaryDeduction { get; set; }
        public decimal InsuranceDeduction { get; set; }
        public decimal TaxDeduction { get; set; }
        public decimal PenaltyDeduction { get; set; }
        public decimal TotalIncome { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal NetPay { get; set; }
        public int StandardDays { get; set; } = 22;
        public int WorkDays { get; set; }
        public int PaidLeaveDays { get; set; }
        public int UnpaidLeaveDays { get; set; }
        public int LateDays { get; set; }
        public int EarlyLeaveDays { get; set; }
        public decimal OvertimeHours { get; set; }

        public string Status { get; set; } = "";
    }
}
