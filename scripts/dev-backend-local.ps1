$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql://sivflow:sivflow@127.0.0.1:5432/sivflow?schema=public"
}
if (-not $env:REDIS_SERVER_HOST) {
  $env:REDIS_SERVER_HOST = "localhost"
}
if (-not $env:REDIS_SERVER_PORT) {
  $env:REDIS_SERVER_PORT = "6379"
}

Write-Host "[Sivflow] DATABASE_URL=$env:DATABASE_URL"
Write-Host "[Sivflow] Redis=$env:REDIS_SERVER_HOST`:$env:REDIS_SERVER_PORT"

Write-Host "[Sivflow] Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[Sivflow] Checking local PostgreSQL / Redis..."
npm run db:check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[Sivflow] Applying PostgreSQL migrations..."
npm run db:migrate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[Sivflow] Starting backend..."
npm run dev:backend
exit $LASTEXITCODE
