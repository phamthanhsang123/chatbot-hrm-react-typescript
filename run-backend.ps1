$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $env:ConnectionStrings__DefaultConnection) {
  Write-Host "Using backend/Admin/appsettings.Development.json or appsettings.json for database connection."
}

if (-not $env:Jwt__Key) {
  $env:Jwt__Key = "LOCAL_DEV_SECRET_KEY_FOR_HRM_ADMIN_API_32_CHARS"
}

Set-Location -LiteralPath $Root
dotnet run --project "backend\Admin\Admin.csproj"
