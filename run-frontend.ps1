$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Frontend = Join-Path $Root "frontend"

Set-Location -LiteralPath $Frontend

$NextCache = Join-Path $Frontend ".next"
if (Test-Path -LiteralPath $NextCache) {
  Remove-Item -LiteralPath $NextCache -Recurse -Force
}

node ".\node_modules\next\dist\bin\next" dev
