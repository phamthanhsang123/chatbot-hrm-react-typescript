using System.ComponentModel.DataAnnotations.Schema;

namespace Admin.Models
{
    [Table("positions")]
    public class Position
    {
        [Column("position_id")]
        public int Id { get; set; }

        [Column("position_name")]
        public string Title { get; set; } = null!;

        [Column("department_id")]
        public int? DepartmentId { get; set; }

        [NotMapped]
        public string? BaseSalaryRange { get; set; }

        public Department? Department { get; set; }
        public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    }
}
