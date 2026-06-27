$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "[Sivflow] Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql://sivflow@localhost:5432/sivflow?schema=public"
}
Write-Host "[Sivflow] DATABASE_URL=$env:DATABASE_URL"

Write-Host "[Sivflow] Checking local PostgreSQL / Redis..."
npm run db:check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[Sivflow] Applying PostgreSQL migrations..."
npm run db:migrate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[Sivflow] Starting backend..."
npm run dev:backend
exit $LASTEXITCODE
