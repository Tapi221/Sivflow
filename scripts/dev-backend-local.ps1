$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "[Sivflow] Docker status check..."
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
& docker version *> $null
if ($LASTEXITCODE -ne 0) {
  if (Test-Path $dockerPath) {
    Write-Host "[Sivflow] Starting Docker Desktop..."
    Start-Process $dockerPath
    Write-Host "[Sivflow] Docker Desktop started. Run this script again after Docker is ready."
    exit 1
  }

  Write-Error "Docker is not running. Start Docker Desktop first."
  exit 1
}

Write-Host "[Sivflow] Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[Sivflow] Starting PostgreSQL / Redis..."
npm run db:up
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$env:DATABASE_URL = "postgresql://sivflow:sivflow@localhost:5432/sivflow?schema=public"
Write-Host "[Sivflow] DATABASE_URL=$env:DATABASE_URL"

Write-Host "[Sivflow] Starting backend..."
npm run dev:backend
exit $LASTEXITCODE
