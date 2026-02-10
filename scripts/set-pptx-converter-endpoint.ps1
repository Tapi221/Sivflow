param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,
  [Parameter(Mandatory = $true)]
  [string]$Endpoint
)

$ErrorActionPreference = "Stop"

if ($Endpoint -notmatch '^https?://') {
  throw "Endpoint must start with http:// or https://"
}

if ($Endpoint -notmatch '/convert/?$') {
  throw "Endpoint must end with /convert"
}

$normalizedEndpoint = $Endpoint.TrimEnd("/")
if ($normalizedEndpoint -notmatch '/convert$') {
  $normalizedEndpoint = "$normalizedEndpoint/convert"
}

$envFile = Join-Path "functions" ".env.$ProjectId"
$before = @()
if (Test-Path $envFile) {
  $before = Get-Content -Path $envFile
}

$filtered = @()
foreach ($line in $before) {
  if ($line -match '^\s*PPTX_CONVERTER_ENDPOINT\s*=') { continue }
  if ($line -match '^\s*PPTX_CONVERTER_IMPLEMENTATION\s*=') { continue }
  $filtered += $line
}

$after = @()
$after += $filtered
$startIndex = 0
while ($startIndex -lt $after.Count -and [string]::IsNullOrWhiteSpace($after[$startIndex])) {
  $startIndex += 1
}
if ($startIndex -gt 0) {
  if ($startIndex -ge $after.Count) {
    $after = @()
  } else {
    $after = $after[$startIndex..($after.Count - 1)]
  }
}
if ($after.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($after[$after.Count - 1])) {
  $after += ""
}
$after += "PPTX_CONVERTER_ENDPOINT=$normalizedEndpoint"
$after += "PPTX_CONVERTER_IMPLEMENTATION=real"

Set-Content -Path $envFile -Value $after -NoNewline:$false

Write-Host "Updated: $envFile"
Write-Host ""
Write-Host "Before/After diff:"

$tempBefore = [System.IO.Path]::GetTempFileName()
$tempAfter = [System.IO.Path]::GetTempFileName()
try {
  Set-Content -Path $tempBefore -Value $before -NoNewline:$false
  Set-Content -Path $tempAfter -Value $after -NoNewline:$false
  & git --no-pager diff --no-index -- $tempBefore $tempAfter
  if ($LASTEXITCODE -gt 1) {
    throw "Failed to render diff (git exit code: $LASTEXITCODE)"
  }
} finally {
  Remove-Item -Force -ErrorAction SilentlyContinue $tempBefore
  Remove-Item -Force -ErrorAction SilentlyContinue $tempAfter
}

Write-Host ""
Write-Host "Effective settings:"
Write-Host "  PPTX_CONVERTER_ENDPOINT=$normalizedEndpoint"
Write-Host "  PPTX_CONVERTER_IMPLEMENTATION=real"
