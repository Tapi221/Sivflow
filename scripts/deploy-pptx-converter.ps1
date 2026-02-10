param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "us-central1",
  [string]$ServiceName = "pptx-converter",
  [string]$Memory = "2Gi",
  [string]$Cpu = "1",
  [int]$TimeoutSeconds = 120,
  [string]$RuntimeServiceAccount = "",
  [string]$FunctionsServiceAccount = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$Description
  )

  Write-Host "==> $Description"
  Write-Host "    $Executable $($Arguments -join ' ')"
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($Description): $Executable $($Arguments -join ' ')"
  }
}

function Test-CommandSuccess {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $Executable @Arguments *> $null
  return $LASTEXITCODE -eq 0
}

if (-not (Test-Path "services/pptx-converter")) {
  throw "services/pptx-converter が見つかりません。"
}
if (-not (Test-Path "services/pptx-converter/Dockerfile") -and -not (Test-Path "services/pptx-converter/package.json")) {
  throw "services/pptx-converter に Dockerfile も package.json もありません。real converter 実装を配置してから実行してください。"
}

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud コマンドが見つかりません。Google Cloud SDK をインストールしてください。"
}

Invoke-CheckedCommand -Executable "gcloud" -Arguments @("config", "set", "project", $ProjectId) -Description "Set gcloud project"

if (-not (Test-CommandSuccess -Executable "gcloud" -Arguments @("secrets", "describe", "PPTX_CONVERTER_TOKEN", "--project", $ProjectId))) {
  Write-Error "Secret 'PPTX_CONVERTER_TOKEN' が存在しません。先に作成してください。"
  Write-Host "例:"
  Write-Host "  echo -n '<token>' | gcloud secrets create PPTX_CONVERTER_TOKEN --replication-policy=automatic --data-file=- --project $ProjectId"
  Write-Host "  echo -n '<token>' | gcloud secrets versions add PPTX_CONVERTER_TOKEN --data-file=- --project $ProjectId"
  exit 1
}

$projectNumber = (& gcloud projects describe $ProjectId --format "value(projectNumber)").Trim()
if (-not $projectNumber) {
  throw "Project number を取得できませんでした。"
}

if (-not $RuntimeServiceAccount) {
  $RuntimeServiceAccount = "pptx-converter-runtime@$ProjectId.iam.gserviceaccount.com"
}

$runtimeSaExists = Test-CommandSuccess -Executable "gcloud" -Arguments @(
  "iam", "service-accounts", "describe", $RuntimeServiceAccount, "--project", $ProjectId
)

if (-not $runtimeSaExists) {
  $expectedDefault = "pptx-converter-runtime@$ProjectId.iam.gserviceaccount.com"
  if ($RuntimeServiceAccount -ne $expectedDefault) {
    throw "Runtime service account '$RuntimeServiceAccount' が存在しません。手動で作成するか、-RuntimeServiceAccount を省略してください。"
  }

  Invoke-CheckedCommand -Executable "gcloud" -Arguments @(
    "iam", "service-accounts", "create", "pptx-converter-runtime",
    "--display-name", "PPTX Converter Runtime",
    "--project", $ProjectId
  ) -Description "Create dedicated runtime service account"
}

Invoke-CheckedCommand -Executable "gcloud" -Arguments @(
  "projects", "add-iam-policy-binding", $ProjectId,
  "--member", "serviceAccount:$RuntimeServiceAccount",
  "--role", "roles/storage.objectAdmin"
) -Description "Grant runtime SA storage.objectAdmin"

$deployArgs = @(
  "run", "deploy", $ServiceName,
  "--project", $ProjectId,
  "--region", $Region,
  "--source", "services/pptx-converter",
  "--platform", "managed",
  "--memory", $Memory,
  "--cpu", $Cpu,
  "--timeout", "${TimeoutSeconds}s",
  "--service-account", $RuntimeServiceAccount,
  "--set-env-vars", "PPTX_STORAGE_BUCKET=$ProjectId.firebasestorage.app,PPTX_MAX_SLIDES=200,PPTX_CONVERSION_DPI=160,PPTX_COMMAND_TIMEOUT_MS=120000",
  "--set-secrets", "PPTX_CONVERTER_TOKEN=PPTX_CONVERTER_TOKEN:latest",
  "--no-allow-unauthenticated",
  "--quiet"
)
Invoke-CheckedCommand -Executable "gcloud" -Arguments $deployArgs -Description "Deploy pptx-converter (IAM required)"

if (-not $FunctionsServiceAccount) {
  $FunctionsServiceAccount = (& gcloud functions describe onPptxConversionQueued --gen2 --region $Region --project $ProjectId --format "value(serviceConfig.serviceAccountEmail)" 2>$null).Trim()
  if (-not $FunctionsServiceAccount) {
    $FunctionsServiceAccount = "$ProjectId@appspot.gserviceaccount.com"
  }
}

Invoke-CheckedCommand -Executable "gcloud" -Arguments @(
  "run", "services", "add-iam-policy-binding", $ServiceName,
  "--project", $ProjectId,
  "--region", $Region,
  "--member", "serviceAccount:$FunctionsServiceAccount",
  "--role", "roles/run.invoker"
) -Description "Grant Cloud Run invoker to Functions service account"

& gcloud run services remove-iam-policy-binding $ServiceName `
  --project $ProjectId `
  --region $Region `
  --member allUsers `
  --role roles/run.invoker `
  --quiet *> $null

$serviceUrl = (& gcloud run services describe $ServiceName --project $ProjectId --region $Region --format "value(status.url)").Trim()
if (-not $serviceUrl) {
  throw "Cloud Run service URL を取得できませんでした。"
}
$converterEndpoint = "$serviceUrl/convert"

Write-Host ""
Write-Host "Cloud Run deployed successfully."
Write-Host "  Base URL:      $serviceUrl"
Write-Host "  Converter URL: $converterEndpoint"
Write-Host "  Runtime SA:    $RuntimeServiceAccount"
Write-Host "  Invoker SA:    $FunctionsServiceAccount"
Write-Host ""
Write-Host "権限で詰まった場合の確認コマンド:"
Write-Host "  gcloud run services describe $ServiceName --project $ProjectId --region $Region --format=""value(spec.template.spec.serviceAccountName)"""
Write-Host "  gcloud projects add-iam-policy-binding $ProjectId --member=""serviceAccount:<SERVICE_ACCOUNT_EMAIL>"" --role=""roles/storage.objectAdmin"""
Write-Host ""
Write-Host "将来的にIAM認証のみへさらに厳格化する場合は、Functions側ID tokenのみを許可し、tokenヘッダは段階的に廃止できます。"
