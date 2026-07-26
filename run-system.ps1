$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendScript = Join-Path $Root "run-backend.ps1"
$FrontendScript = Join-Path $Root "run-frontend.ps1"

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$BackendScript`""

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$FrontendScript`""

Write-Host "Backend:  http://localhost:5297/swagger"
Write-Host "Frontend: http://localhost:3000"
