$ErrorActionPreference = "Stop"

Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

Write-Host "[Sivflow] Docker の状態を確認します..."
try {
  docker version | Out-Null
} catch {
  $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dockerPath) {
    Write-Host "[Sivflow] Docker Desktop を起動します..."
    Start-Process $dockerPath
    Write-Host "[Sivflow] Docker Desktop の起動後に、もう一度このコマンドを実行してください。"
    exit 1
  }

  throw "Docker が起動していません。Docker Desktop を起動してください。"
}

Write-Host "[Sivflow] npm 依存関係をインストールします..."
npm install

Write-Host "[Sivflow] PostgreSQL / Redis を起動します..."
npm run db:up

$env:DATABASE_URL = "postgresql://sivflow:sivflow@localhost:5432/sivflow?schema=public"
Write-Host "[Sivflow] DATABASE_URL=$env:DATABASE_URL"

Write-Host "[Sivflow] バックエンドを起動します..."
npm run dev:backend
