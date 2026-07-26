using Admin.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Payroll> Payrolls { get; set; }

        // ✅ THÊM DÒNG NÀY
        public DbSet<Attendance> Attendances { get; set; }
        public DbSet<AttendanceRequest> AttendanceRequests { get; set; }
        public DbSet<AttendanceShift> AttendanceShifts { get; set; }

        // ✅ THÊM 2 BẢNG DANH MỤC
        public DbSet<Department> Departments { get; set; }
        public DbSet<Position> Positions { get; set; }

        public DbSet<LeaveRequest> LeaveRequests { get; set; }
        public DbSet<LeaveType> LeaveTypes { get; set; }
        public DbSet<EmployeeTask> Tasks { get; set; }
        public DbSet<TaskProgressLog> TaskProgressLogs { get; set; }
        public DbSet<TaskReview> TaskReviews { get; set; }
        public DbSet<CompetencyReview> CompetencyReviews { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // =========================
            // EMPLOYEE
            // =========================
            modelBuilder.Entity<Employee>(entity =>
            {
                entity.ToTable("employees");   // 👈 QUAN TRỌNG
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("employee_id");

                entity.Property(e => e.Email).HasColumnName("email");
                entity.Property(e => e.Password).HasColumnName("password").IsRequired(false);
                entity.Property(e => e.Role).HasColumnName("role");
                entity.Property(e => e.FullName).HasColumnName("full_name");
                entity.Property(e => e.Phone).HasColumnName("phone");
                entity.Property(e => e.Cccd).HasColumnName("cccd");
                entity.Property(e => e.Status).HasColumnName("status");

                // ✅ BỔ SUNG ĐẦY ĐỦ THEO MYSQL
                entity.Property(e => e.DepartmentId).HasColumnName("department_id");
                entity.Property(e => e.PositionId).HasColumnName("position_id");
                entity.Property(e => e.SalaryBase).HasColumnName("salary_base");
                entity.Ignore(e => e.CreatedAt);
            });

            // =========================
            // DEPARTMENT
            // =========================
            modelBuilder.Entity<Department>(entity =>
            {
                entity.ToTable("departments");
                entity.HasKey(d => d.Id);

                entity.Property(d => d.Id).HasColumnName("department_id");
                entity.Property(d => d.Name).HasColumnName("department_name");
                entity.Ignore(d => d.Description);
            });

            // =========================
            // POSITION
            // =========================
            modelBuilder.Entity<Position>(entity =>
            {
                entity.ToTable("positions");
                entity.HasKey(p => p.Id);

                entity.Property(p => p.Id).HasColumnName("position_id");
                entity.Property(p => p.Title).HasColumnName("position_name");
                entity.Property(p => p.DepartmentId).HasColumnName("department_id");
                entity.Ignore(p => p.BaseSalaryRange);

                entity.HasOne(p => p.Department)
                    .WithMany()
                    .HasForeignKey(p => p.DepartmentId);
            });

            // =========================
            // FK: Employee -> Department, Position
            // =========================
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(e => e.DepartmentId);

            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Position)
                .WithMany(p => p.Employees)
                .HasForeignKey(e => e.PositionId);

            // =========================
            // PAYROLL
            // =========================
            modelBuilder.Entity<Payroll>(entity =>
            {
                entity.ToTable("payroll");
                entity.HasKey(p => p.Id);

                entity.Property(p => p.Id).HasColumnName("payroll_id");
                entity.Property(p => p.EmployeeId).HasColumnName("employee_id");
                entity.Property(p => p.Month).HasColumnName("month");
                entity.Property(p => p.Year).HasColumnName("year");
                entity.Property(p => p.SalaryBase).HasColumnName("salary_base");
                entity.Property(p => p.Bonus).HasColumnName("bonus");
                entity.Property(p => p.Deductions).HasColumnName("deductions");
                entity.Property(p => p.TotalSalary).HasColumnName("total_salary");
                entity.Property(p => p.Status).HasColumnName("status");
            });

            // =========================
            // ATTENDANCE (giữ nguyên)
            // =========================
            modelBuilder.Entity<Attendance>(entity =>
            {
                entity.ToTable("attendance");
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id).HasColumnName("attendance_id");
                entity.Property(x => x.EmployeeId).HasColumnName("employee_id");
                entity.Property(x => x.Date).HasColumnName("work_date");

                entity.Property(x => x.CheckInTime).HasColumnName("check_in");
                entity.Property(x => x.CheckOutTime).HasColumnName("check_out");
                entity.Property(x => x.WorkReportTitle).HasColumnName("work_report_title");
                entity.Property(x => x.WorkReportDescription).HasColumnName("work_report_description");
                entity.Property(x => x.WorkReportNote).HasColumnName("work_report_note");

                entity.Ignore(x => x.TotalHours);
                entity.Ignore(x => x.IsLate);
                entity.Ignore(x => x.IsEarlyLeave);
                entity.Ignore(x => x.Note);
                entity.Ignore(x => x.Status);
                entity.Property(x => x.CreatedAt).HasColumnName("created_at");
                entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            });

            modelBuilder.Entity<AttendanceRequest>(entity =>
            {
                entity.ToTable("attendance_requests");
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id).HasColumnName("request_id");
                entity.Property(x => x.EmployeeId).HasColumnName("employee_id");
                entity.Property(x => x.WorkDate).HasColumnName("work_date");
                entity.Property(x => x.RequestType).HasColumnName("request_type");
                entity.Property(x => x.RequestedCheckIn).HasColumnName("requested_check_in");
                entity.Property(x => x.RequestedCheckOut).HasColumnName("requested_check_out");
                entity.Property(x => x.OriginalCheckIn).HasColumnName("original_check_in");
                entity.Property(x => x.OriginalCheckOut).HasColumnName("original_check_out");
                entity.Property(x => x.Reason).HasColumnName("reason");
                entity.Property(x => x.WorkReportTitle).HasColumnName("work_report_title");
                entity.Property(x => x.WorkReportDescription).HasColumnName("work_report_description");
                entity.Property(x => x.Status).HasColumnName("status");
                entity.Property(x => x.ReviewedById).HasColumnName("reviewed_by");
                entity.Property(x => x.ReviewNote).HasColumnName("review_note");
                entity.Property(x => x.SubmittedAt).HasColumnName("submitted_at");
                entity.Property(x => x.ReviewedAt).HasColumnName("reviewed_at");

                entity.HasOne(x => x.Employee)
                    .WithMany()
                    .HasForeignKey(x => x.EmployeeId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Reviewer)
                    .WithMany()
                    .HasForeignKey(x => x.ReviewedById)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<AttendanceShift>(entity =>
            {
                entity.ToTable("attendance_shifts");
                entity.HasKey(x => x.Id);

                entity.HasOne(x => x.Employee)
                    .WithMany()
                    .HasForeignKey(x => x.EmployeeId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // =========================
            // TASKS
            // =========================
            modelBuilder.Entity<EmployeeTask>(entity =>
            {
                entity.ToTable("tasks");
                entity.HasKey(t => t.Id);

                entity.HasOne(t => t.Employee)
                    .WithMany()
                    .HasForeignKey(t => t.EmployeeId);

                entity.HasOne(t => t.Manager)
                    .WithMany()
                    .HasForeignKey(t => t.ManagerId);

                entity.HasOne(t => t.Department)
                    .WithMany()
                    .HasForeignKey(t => t.DepartmentId);
            });

            modelBuilder.Entity<TaskProgressLog>(entity =>
            {
                entity.ToTable("task_progress_logs");
                entity.HasKey(x => x.Id);

                entity.HasOne(x => x.Task)
                    .WithMany(t => t.ProgressLogs)
                    .HasForeignKey(x => x.TaskId);

                entity.HasOne(x => x.Employee)
                    .WithMany()
                    .HasForeignKey(x => x.EmployeeId);
            });

            modelBuilder.Entity<TaskReview>(entity =>
            {
                entity.ToTable("task_reviews");
                entity.HasKey(x => x.Id);

                entity.HasOne(x => x.Task)
                    .WithMany(t => t.Reviews)
                    .HasForeignKey(x => x.TaskId);

                entity.HasOne(x => x.Manager)
                    .WithMany()
                    .HasForeignKey(x => x.ManagerId);
            });

            modelBuilder.Entity<CompetencyReview>(entity =>
            {
                entity.ToTable("competency_reviews");
                entity.HasKey(x => x.Id);

                entity.HasIndex(x => new { x.EmployeeId, x.ReviewMonth, x.ReviewYear })
                    .IsUnique();

                entity.HasOne(x => x.Employee)
                    .WithMany()
                    .HasForeignKey(x => x.EmployeeId);

                entity.HasOne(x => x.Manager)
                    .WithMany()
                    .HasForeignKey(x => x.ManagerId);

                entity.HasOne(x => x.Department)
                    .WithMany()
                    .HasForeignKey(x => x.DepartmentId);
            });
        }
    }
}
