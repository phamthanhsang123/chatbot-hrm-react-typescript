using Admin.Data;
using Admin.Services;
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
