param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,
  [Parameter(Mandatory = $true)]
  [string]$Endpoint
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-ValidEndpoint {
  param([string]$Value)
  if ($Value -notmatch '^https?://') { return $false }
  if ($Value -notmatch '/convert/?$') { return $false }
  return $true
}

function Set-OrInsertEnvLine {
  param(
    [string[]]$Lines,
    [string]$Key,
    [string]$Value
  )

  $pattern = "^\s*$([regex]::Escape($Key))\s*="
  $updated = @()
  $found = $false
  foreach ($line in $Lines) {
    if ($line -match $pattern) {
      if (-not $found) {
        $updated += "$Key=$Value"
        $found = $true
      }
      continue
    }
    $updated += $line
  }
  if (-not $found) {
    if ($updated.Count -gt 0 -and $updated[$updated.Count - 1] -ne "") {
      $updated += ""
    }
    $updated += "$Key=$Value"
  }
  return ,$updated
}

if (-not (Test-ValidEndpoint -Value $Endpoint)) {
  throw "Endpoint は http/https で始まり、末尾が /convert である必要があります: $Endpoint"
}

$envFile = "functions/.env.$ProjectId"
$before = if (Test-Path $envFile) { Get-Content $envFile } else { @() }

$after = Set-OrInsertEnvLine -Lines $before -Key "PPTX_CONVERTER_ENDPOINT" -Value $Endpoint
$after = Set-OrInsertEnvLine -Lines $after -Key "PPTX_CONVERTER_IMPLEMENTATION" -Value "real"

Set-Content -Path $envFile -Value $after -Encoding utf8

Write-Host "Updated: $envFile"
Write-Host ""
Write-Host "[before]"
if ($before.Count -eq 0) {
  Write-Host "(empty)"
} else {
  $before | ForEach-Object { Write-Host $_ }
}

Write-Host ""
Write-Host "[after]"
$after | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "[diff]"
$diff = Compare-Object -ReferenceObject $before -DifferenceObject $after -PassThru
if ($null -eq $diff -or $diff.Count -eq 0) {
  Write-Host "(no changes)"
} else {
  $diff | ForEach-Object { Write-Host $_ }
}
