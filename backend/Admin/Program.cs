using Admin.Data;
using Admin.Services;
using Admin.Models;
using Admin.Services.Agentic;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// =========================
// DATABASE
// =========================
var connectionString = ResolveConnectionString(builder.Configuration);

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new Exception("Missing connection string. Set ConnectionStrings:DefaultConnection, MYSQL_URL, MYSQL_PUBLIC_URL, or DATABASE_URL.");
}

connectionString = NormalizeMySqlConnectionString(connectionString);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseMySql(
        connectionString,
        ServerVersion.Parse("8.0.36-mysql"),
        mySqlOptions =>
        {
            mySqlOptions.CommandTimeout(30);
            mySqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null
            );
        }
    );
});

// =========================
// SERVICES
// =========================
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<EmployeeService>();
builder.Services.AddScoped<SalaryService>();
builder.Services.AddScoped<AttendanceService>();
builder.Services.AddScoped<LeaveRequestService>();
builder.Services.AddScoped<CompetencyService>();
builder.Services.AddScoped<TaskService>();
builder.Services.AddScoped<AgenticCompetencyService>();
builder.Services.AddScoped<AgenticHrmTool>();
builder.Services.AddScoped<AttendanceTool>();
builder.Services.AddScoped<LeaveTool>();
builder.Services.AddScoped<SalaryTool>();
builder.Services.AddScoped<TaskTool>();
builder.Services.AddScoped<AgenticQueryService>();
builder.Services.AddScoped<PolicyTool>();
builder.Services.AddScoped<PlannerAgent>();
builder.Services.AddScoped<DataAgent>();
builder.Services.AddScoped<AnalysisAgent>();
builder.Services.AddScoped<PolicyAgent>();
builder.Services.AddScoped<RecommendationAgent>();
builder.Services.AddScoped<ReflectionAgent>();
builder.Services.AddScoped<ReportAgent>();
builder.Services.AddHttpClient<AgenticLlmService>();
builder.Services.AddScoped<HRAIOrchestrator>();
builder.Services.AddScoped<Cdio4ComparisonDataSeeder>();

// =========================
// CORS
// =========================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "https://chatbot-hrm-react-typescript.vercel.app",
                "https://cdio3-cs-production.up.railway.app"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// =========================
// JWT AUTHENTICATION
// =========================
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "HRM.Admin.API";
var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    jwtKey = "LOCAL_DEV_SECRET_KEY_FOR_HRM_ADMIN_API_32_CHARS";
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            ),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

// =========================
// CONTROLLERS + SWAGGER
// =========================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "HRM Admin API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    app.Urls.Add($"http://0.0.0.0:{port}");
}

// =========================
// PROXY / RAILWAY
// =========================
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

app.UseSwagger();
app.UseSwaggerUI();

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

await EnsureAttendanceWorkflowSchemaAsync(app);
await EnsureSalaryLeaveSchemaAsync(app);
await SeedAdminFromEnvironmentAsync(app);

if (args.Contains("--seed-cdio4-comparison", StringComparer.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<Cdio4ComparisonDataSeeder>();
    var summary = await seeder.SeedAsync();
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(
        summary,
        new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
    return;
}

app.MapControllers();
app.MapGet("/", () => "HRM API is running 🚀");

app.Run();

static string? ResolveConnectionString(IConfiguration configuration)
{
    return configuration.GetConnectionString("DefaultConnection")
        ?? configuration.GetConnectionString("MySql")
        ?? configuration["MYSQL_URL"]
        ?? configuration["MYSQL_PUBLIC_URL"]
        ?? configuration["DATABASE_URL"];
}

static string NormalizeMySqlConnectionString(string rawConnectionString)
{
    var connectionString = rawConnectionString.Trim();

    if (connectionString.StartsWith("mysql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(connectionString);
        var userInfo = uri.UserInfo.Split(':', 2);

        var builder = new MySqlConnector.MySqlConnectionStringBuilder
        {
            Server = uri.Host,
            Port = (uint)(uri.Port > 0 ? uri.Port : 3306),
            Database = uri.AbsolutePath.TrimStart('/'),
            UserID = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(0) ?? ""),
            Password = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? "")
        };

        connectionString = builder.ConnectionString;
    }

    var csBuilder = new MySqlConnector.MySqlConnectionStringBuilder(connectionString)
    {
        ConnectionTimeout = 30,
        DefaultCommandTimeout = 30,
        Keepalive = 15,
        ConnectionIdleTimeout = 60,
        AllowPublicKeyRetrieval = true,
        TreatTinyAsBoolean = false,
        SslMode = MySqlConnector.MySqlSslMode.Preferred
    };

    return csBuilder.ConnectionString;
}

static async Task SeedAdminFromEnvironmentAsync(WebApplication app)
{
    var adminEmail = app.Configuration["SEED_ADMIN_EMAIL"];
    var adminPassword = app.Configuration["SEED_ADMIN_PASSWORD"];

    if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
    {
        return;
    }

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var normalizedEmail = adminEmail.Trim().ToLowerInvariant();
    var admin = await db.Employees.FirstOrDefaultAsync(e => e.Email.ToLower() == normalizedEmail);

    if (admin == null)
    {
        var departmentId = await db.Departments
            .OrderBy(d => d.Id)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync();

        var positionId = await db.Positions
            .Where(p => !departmentId.HasValue || p.DepartmentId == departmentId)
            .OrderBy(p => p.Id)
            .Select(p => (int?)p.Id)
            .FirstOrDefaultAsync();

        admin = new Employee
        {
            Email = normalizedEmail,
            FullName = app.Configuration["SEED_ADMIN_NAME"] ?? "Admin HR",
            Role = "ADMIN",
            Status = "active",
            Phone = app.Configuration["SEED_ADMIN_PHONE"],
            Cccd = app.Configuration["SEED_ADMIN_CCCD"],
            DepartmentId = departmentId,
            PositionId = positionId,
            SalaryBase = 0
        };

        db.Employees.Add(admin);
    }

    admin.Role = "ADMIN";
    admin.Password = BCrypt.Net.BCrypt.HashPassword(adminPassword);
    await db.SaveChangesAsync();
}

static async Task EnsureAttendanceWorkflowSchemaAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS attendance (
            attendance_id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            work_date DATE NOT NULL,
            check_in TIME NULL,
            check_out TIME NULL,
            work_report_title VARCHAR(255) NULL,
            work_report_description TEXT NULL,
            work_report_note TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_attendance_employee_date (employee_id, work_date),
            CONSTRAINT fk_attendance_employee
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                ON UPDATE CASCADE ON DELETE CASCADE
        )
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS attendance_requests (
            request_id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            work_date DATE NOT NULL,
            request_type VARCHAR(30) NOT NULL,
            requested_check_in DATETIME NULL,
            requested_check_out DATETIME NULL,
            original_check_in DATETIME NULL,
            original_check_out DATETIME NULL,
            reason TEXT NOT NULL,
            work_report_title VARCHAR(255) NULL,
            work_report_description TEXT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
            reviewed_by INT NULL,
            review_note TEXT NULL,
            submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME NULL,
            INDEX idx_attendance_requests_employee (employee_id),
            INDEX idx_attendance_requests_date (work_date),
            INDEX idx_attendance_requests_status (status),
            CONSTRAINT fk_attendance_request_employee
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_attendance_request_reviewer
                FOREIGN KEY (reviewed_by) REFERENCES employees(employee_id)
                ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT chk_attendance_request_type
                CHECK (request_type IN ('SUPPLEMENT', 'ADJUSTMENT')),
            CONSTRAINT chk_attendance_request_status
                CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
        )
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS attendance_shifts (
            shift_id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            work_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_attendance_shifts_employee_date (employee_id, work_date),
            CONSTRAINT fk_attendance_shift_employee
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT chk_attendance_shift_status
                CHECK (status IN ('PLANNED', 'WORKING', 'COMPLETED', 'CANCELLED'))
        )
        """);

    await EnsureColumnAsync(db, "attendance", "work_report_title", "`work_report_title` VARCHAR(255) NULL");
    await EnsureColumnAsync(db, "attendance", "work_report_description", "`work_report_description` TEXT NULL");
    await EnsureColumnAsync(db, "attendance", "work_report_note", "`work_report_note` TEXT NULL");
    await EnsureColumnAsync(db, "attendance", "created_at", "`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
    await EnsureColumnAsync(db, "attendance", "updated_at", "`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    await EnsureColumnAsync(db, "attendance_requests", "work_report_title", "`work_report_title` VARCHAR(255) NULL");
    await EnsureColumnAsync(db, "attendance_requests", "work_report_description", "`work_report_description` TEXT NULL");
}

static async Task EnsureSalaryLeaveSchemaAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS leave_types (
            Id INT AUTO_INCREMENT PRIMARY KEY,
            Name VARCHAR(100) NOT NULL UNIQUE
        )
        """);

    await db.Database.ExecuteSqlRawAsync("""
        INSERT INTO leave_types (Id, Name) VALUES
            (1, 'Nghỉ phép năm'),
            (2, 'Nghỉ ốm'),
            (3, 'Nghỉ không lương'),
            (4, 'Nghỉ thai sản'),
            (5, 'Nghỉ cưới'),
            (6, 'Nghỉ tang')
        ON DUPLICATE KEY UPDATE Name = VALUES(Name)
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS leave_requests (
            leave_id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            leave_type_id INT NOT NULL DEFAULT 1,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_days INT NOT NULL DEFAULT 1,
            reason TEXT NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'Chờ duyệt',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_leave_requests_employee (employee_id),
            INDEX idx_leave_requests_status (status),
            CONSTRAINT fk_leave_requests_employee
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_leave_requests_type
                FOREIGN KEY (leave_type_id) REFERENCES leave_types(Id)
                ON UPDATE CASCADE ON DELETE RESTRICT
        )
        """);

    await EnsureColumnAsync(
        db,
        "leave_requests",
        "leave_type_id",
        "`leave_type_id` INT NOT NULL DEFAULT 1");
    await EnsureColumnAsync(
        db,
        "leave_requests",
        "total_days",
        "`total_days` INT NOT NULL DEFAULT 1");
    await EnsureColumnAsync(
        db,
        "leave_requests",
        "created_at",
        "`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
    await db.Database.ExecuteSqlRawAsync("""
        UPDATE leave_requests
        SET reason = ''
        WHERE reason IS NULL
        """);
    await db.Database.ExecuteSqlRawAsync("""
        UPDATE leave_requests
        SET status = 'Chờ duyệt'
        WHERE status IS NULL OR TRIM(status) = ''
        """);
    await db.Database.ExecuteSqlRawAsync("""
        UPDATE leave_requests
        SET total_days = DATEDIFF(end_date, start_date) + 1
        WHERE total_days IS NULL
           OR total_days <> DATEDIFF(end_date, start_date) + 1
        """);

    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS payroll (
            Id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            Month INT NOT NULL,
            Year INT NOT NULL,
            salary_base DECIMAL(15,2) NOT NULL DEFAULT 0,
            Bonus DECIMAL(15,2) NOT NULL DEFAULT 0,
            Deductions DECIMAL(15,2) NOT NULL DEFAULT 0,
            total_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
            Status VARCHAR(30) NOT NULL DEFAULT 'Chờ duyệt',
            UNIQUE KEY uq_payroll_employee_period (employee_id, Year, Month),
            INDEX idx_payroll_period (Year, Month),
            INDEX idx_payroll_status (Status),
            CONSTRAINT fk_payroll_employee
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                ON UPDATE CASCADE ON DELETE CASCADE
        )
        """);
}

static async Task EnsureColumnAsync(
    AppDbContext db,
    string tableName,
    string columnName,
    string columnDefinition)
{
    var connection = db.Database.GetDbConnection();
    if (connection.State != System.Data.ConnectionState.Open)
    {
        await connection.OpenAsync();
    }

    await using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = @tableName
          AND COLUMN_NAME = @columnName
        """;

    var tableParameter = command.CreateParameter();
    tableParameter.ParameterName = "@tableName";
    tableParameter.Value = tableName;
    command.Parameters.Add(tableParameter);

    var columnParameter = command.CreateParameter();
    columnParameter.ParameterName = "@columnName";
    columnParameter.Value = columnName;
    command.Parameters.Add(columnParameter);

    var exists = Convert.ToInt32(await command.ExecuteScalarAsync()) > 0;
    if (!exists)
    {
        var alterSql = $"ALTER TABLE `{tableName}` ADD COLUMN {columnDefinition}";
        await db.Database.ExecuteSqlRawAsync(alterSql);
    }
}
