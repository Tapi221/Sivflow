param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,
  [string]$Region = "us-central1",
  [string]$ServiceName = "pptx-converter",
  [string]$Memory = "2Gi",
  [string]$Cpu = "1",
  [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = "Stop"

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Require-Command -Name "gcloud"

if ($TimeoutSeconds -lt 30 -or $TimeoutSeconds -gt 3600) {
  throw "TimeoutSeconds must be between 30 and 3600."
}

Write-Host "[deploy-pptx-converter] project=$ProjectId region=$Region service=$ServiceName"

Write-Host "[1/5] gcloud project switch"
Invoke-External -Label "gcloud config set project" -Command {
  gcloud config set project $ProjectId
}

Write-Host "[2/5] checking Secret Manager token"
$secretExists = $true
& gcloud secrets describe "PPTX_CONVERTER_TOKEN" --project $ProjectId | Out-Null
if ($LASTEXITCODE -ne 0) {
  $secretExists = $false
}

if (-not $secretExists) {
  Write-Host ""
  Write-Host "Secret 'PPTX_CONVERTER_TOKEN' not found in project '$ProjectId'."
  Write-Host "Create it manually, then rerun this script:"
  Write-Host "  gcloud secrets create PPTX_CONVERTER_TOKEN --replication-policy=automatic --project $ProjectId"
  Write-Host "  echo -n '<your-token>' | gcloud secrets versions add PPTX_CONVERTER_TOKEN --data-file=- --project $ProjectId"
  exit 1
}

Write-Host "[3/5] deploying Cloud Run service"
$sourceDir = "services/pptx-converter"
if (-not (Test-Path $sourceDir)) {
  throw "Source directory not found: $sourceDir"
}

Invoke-External -Label "gcloud run deploy" -Command {
  gcloud run deploy $ServiceName `
    --project $ProjectId `
    --region $Region `
    --source $sourceDir `
    --memory $Memory `
    --cpu $Cpu `
    --timeout "$TimeoutSeconds" `
    --allow-unauthenticated `
    --set-env-vars "PPTX_MAX_SLIDES=200,PPTX_CONVERSION_DPI=160,PPTX_COMMAND_TIMEOUT_MS=120000,PPTX_STORAGE_BUCKET=$ProjectId.firebasestorage.app" `
    --set-secrets "PPTX_CONVERTER_TOKEN=PPTX_CONVERTER_TOKEN:latest"
}

Write-Host "[4/5] resolving service URL"
$baseUrl = (& gcloud run services describe $ServiceName `
  --project $ProjectId `
  --region $Region `
  --format "value(status.url)").Trim()
if ($LASTEXITCODE -ne 0) {
  throw "gcloud run services describe failed with exit code $LASTEXITCODE"
}

if ([string]::IsNullOrWhiteSpace($baseUrl)) {
  throw "Failed to resolve Cloud Run service URL."
}

$endpoint = "$baseUrl/convert"

Write-Host ""
Write-Host "Cloud Run base URL: $baseUrl"
Write-Host "Converter endpoint: $endpoint"
Write-Host ""
Write-Host "[5/5] IAM note (not executed)"
$serviceAccount = (& gcloud run services describe $ServiceName `
  --project $ProjectId `
  --region $Region `
  --format "value(spec.template.spec.serviceAccountName)").Trim()
if ($LASTEXITCODE -ne 0) {
  throw "gcloud run services describe (service account) failed with exit code $LASTEXITCODE"
}

if ([string]::IsNullOrWhiteSpace($serviceAccount)) {
  Write-Host "Service account could not be resolved from service describe output."
} else {
  Write-Host "Cloud Run service account: $serviceAccount"
  Write-Host "If converter cannot read/write GCS, grant role manually:"
  Write-Host "  gcloud projects add-iam-policy-binding $ProjectId --member=""serviceAccount:$serviceAccount"" --role=""roles/storage.objectAdmin"""
}

Write-Host ""
Write-Host "Note: currently deploys with --allow-unauthenticated, but runtime is still protected by x-pptx-converter-token."
Write-Host "For stricter posture, you can migrate to IAM-authenticated invocation later."
