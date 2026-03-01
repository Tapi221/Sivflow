param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Bucket = "",
  [string]$Uid = "e2e-pptx-failure-user",
  [string]$BrokenEndpoint = "https://127.0.0.1.invalid/convert",
  [int]$Slides = 1,
  [int]$PollTimeoutSeconds = 120,
  [int]$PollIntervalSeconds = 4,
  [string]$CredentialsFile = ""
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

function Set-OrInsertEnvLine {
  param([string[]]$Lines, [string]$Key, [string]$Value)
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

function Invoke-NodeJson {
  param([string]$ScriptContent, [string[]]$Arguments)
  $repoTmpDir = ".tmp"
  New-Item -Path $repoTmpDir -ItemType Directory -Force | Out-Null
  $tmpFile = Join-Path $repoTmpDir ("pptx-e2e-failure-" + [Guid]::NewGuid().ToString("N") + ".cjs")
  try {
    Set-Content -Path $tmpFile -Value $ScriptContent -Encoding utf8
    $output = & node $tmpFile @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Node helper failed: $tmpFile"
    }
    $jsonText = ($output -join "`n").Trim()
    if (-not $jsonText) { throw "Node helper returned empty output." }
    return $jsonText | ConvertFrom-Json -Depth 20
  } finally {
    if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force }
  }
}

function Resolve-GoogleCredentials {
  param(
    [string]$CredentialsFileParam
  )

  $repoDefault = (Resolve-Path ".").Path + "\serviceAccountKey.json"

  if ($CredentialsFileParam) {
    $resolved = Resolve-Path $CredentialsFileParam -ErrorAction SilentlyContinue
    if (-not $resolved) {
      throw "CredentialsFile が見つかりません: $CredentialsFileParam"
    }
    return $resolved.Path
  }

  if ($env:GOOGLE_APPLICATION_CREDENTIALS) {
    $resolved = Resolve-Path $env:GOOGLE_APPLICATION_CREDENTIALS -ErrorAction SilentlyContinue
    if ($resolved) {
      return $resolved.Path
    }
    throw "GOOGLE_APPLICATION_CREDENTIALS が指定されていますがファイルが見つかりません: $($env:GOOGLE_APPLICATION_CREDENTIALS)"
  }

  if (Test-Path $repoDefault) {
    return $repoDefault
  }

  return $null
}

if ($BrokenEndpoint -notmatch '^https?://' -or $BrokenEndpoint -notmatch '/convert/?$') {
  throw "BrokenEndpoint must be http/https and end with /convert: $BrokenEndpoint"
}

if (-not $Bucket) {
  $Bucket = "$ProjectId.firebasestorage.app"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "node コマンドが見つかりません。"
}
if (-not (Get-Command gsutil -ErrorAction SilentlyContinue)) {
  throw "gsutil コマンドが見つかりません。"
}
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
  throw "firebase CLI が見つかりません。"
}
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud コマンドが見つかりません。"
}

$resolvedCreds = Resolve-GoogleCredentials -CredentialsFileParam $CredentialsFile
if ($resolvedCreds) {
  $env:GOOGLE_APPLICATION_CREDENTIALS = $resolvedCreds
  Write-Host "Using GOOGLE_APPLICATION_CREDENTIALS: $resolvedCreds"
} else {
  Write-Host "No credentials file provided/found. Falling back to ADC (gcloud auth application-default)."
}

& gcloud auth application-default print-access-token *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Google credentials の解決に失敗しました。-CredentialsFile / GOOGLE_APPLICATION_CREDENTIALS / ./serviceAccountKey.json のいずれかを用意するか、'gcloud auth application-default login' を実行してください。"
}

& gsutil ls "gs://$Bucket/" *> $null
if ($LASTEXITCODE -ne 0) {
  throw "gsutil のプリフライトに失敗しました。Bucket 参照権限を確認してください: gs://$Bucket/"
}

$envFile = "functions/.env.$ProjectId"
$envExisted = Test-Path $envFile
$envOriginal = if ($envExisted) { Get-Content $envFile } else { @() }
$allowSameAliasBefore = $env:ALLOW_SAME_PROJECT_ALIAS
$allowProdUnsafeBefore = $env:ALLOW_PROD_UNSAFE_CONVERTER_ENDPOINT
$env:ALLOW_SAME_PROJECT_ALIAS = "1"
$env:ALLOW_PROD_UNSAFE_CONVERTER_ENDPOINT = "1"

$restoreFailed = $false
try {
  $modified = Set-OrInsertEnvLine -Lines $envOriginal -Key "PPTX_CONVERTER_ENDPOINT" -Value $BrokenEndpoint
  $modified = Set-OrInsertEnvLine -Lines $modified -Key "PPTX_CONVERTER_IMPLEMENTATION" -Value "real"
  Set-Content -Path $envFile -Value $modified -Encoding utf8

  Invoke-CheckedCommand -Executable "firebase" -Arguments @(
    "deploy", "--only", "functions", "--project", $ProjectId
  ) -Description "Deploy functions with broken converter endpoint"

  $docId = [Guid]::NewGuid().ToString("N")
  $sourceStoragePath = "users/$Uid/documents/$docId/source.pptx"
  $tmpDir = Join-Path $env:TEMP "pptx-e2e-failure-$docId"
  $samplePath = Join-Path $tmpDir "sample.pptx"
  New-Item -Path $tmpDir -ItemType Directory -Force | Out-Null

  Invoke-CheckedCommand -Executable "node" -Arguments @(
    "scripts/generate-sample-pptx.mjs",
    "--out", $samplePath,
    "--slides", [string]$Slides
  ) -Description "Generate sample PPTX for failure case"

  Invoke-CheckedCommand -Executable "gsutil" -Arguments @(
    "cp", $samplePath, "gs://$Bucket/$sourceStoragePath"
  ) -Description "Upload sample PPTX to GCS"

  $seedScript = @'
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const [projectId, uid, docId, sourceStoragePath] = process.argv.slice(2);
if (!projectId || !uid || !docId || !sourceStoragePath) throw new Error("missing_args");

if (!admin.apps.length) admin.initializeApp({ projectId });
const db = admin.firestore();

(async () => {
  const now = FieldValue.serverTimestamp();
  await db.doc(`users/${uid}/documents/${docId}`).set(
    {
      id: docId,
      userId: uid,
      kind: "pptx",
      title: `E2E fail ${docId}.pptx`,
      storagePath: sourceStoragePath,
      uploadStatus: "ready",
      pptxManifestStatus: "queued",
      convertStatus: "queued",
      createdAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  await db.doc(`users/${uid}/pptxConversions/${docId}`).set(
    {
      docId,
      uid,
      sourceStoragePath,
      status: "queued",
      createdAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  console.log(JSON.stringify({ ok: true }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@
  [void](Invoke-NodeJson -ScriptContent $seedScript -Arguments @($ProjectId, $Uid, $docId, $sourceStoragePath))

  $pollScript = @'
const admin = require("firebase-admin");

const [projectId, uid, docId] = process.argv.slice(2);
if (!projectId || !uid || !docId) throw new Error("missing_args");
if (!admin.apps.length) admin.initializeApp({ projectId });

(async () => {
  const snap = await admin.firestore().doc(`users/${uid}/pptxConversions/${docId}`).get();
  if (!snap.exists) {
    console.log(JSON.stringify({ exists: false }));
    return;
  }
  const data = snap.data() || {};
  console.log(JSON.stringify({
    exists: true,
    status: data.status || null,
    errorMessage: data.errorMessage || null
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@

  $statusSequence = New-Object System.Collections.Generic.List[string]
  $deadline = (Get-Date).AddSeconds($PollTimeoutSeconds)
  $latest = $null
  while ((Get-Date) -lt $deadline) {
    $latest = Invoke-NodeJson -ScriptContent $pollScript -Arguments @($ProjectId, $Uid, $docId)
    if (-not $latest.exists) {
      Start-Sleep -Seconds 1
      continue
    }
    $status = [string]$latest.status
    if ($status -and ($statusSequence.Count -eq 0 -or $statusSequence[$statusSequence.Count - 1] -ne $status)) {
      $statusSequence.Add($status)
      Write-Host "Status => $status"
    }
    if ($status -eq "ready" -or $status -eq "failed") {
      break
    }
    Start-Sleep -Seconds $PollIntervalSeconds
  }

  if ($null -eq $latest -or -not $latest.exists) {
    throw "Conversion document was not found."
  }

  $finalStatus = [string]$latest.status
  $errorMessage = [string]$latest.errorMessage
  if ($finalStatus -ne "failed") {
    throw "Expected failed but got $finalStatus"
  }
  if ($errorMessage -notmatch 'converter_http_') {
    throw "Expected converter_http_* errorMessage but got: $errorMessage"
  }

  Write-Host ""
  Write-Host "DOC_ID=$docId"
  Write-Host "STATUS_SEQUENCE=$($statusSequence -join '>')"
  Write-Host "FINAL_STATUS=$finalStatus"
  Write-Host "ERROR_MESSAGE=$errorMessage"
}
finally {
  try {
    if ($envExisted) {
      Set-Content -Path $envFile -Value $envOriginal -Encoding utf8
    } elseif (Test-Path $envFile) {
      Remove-Item $envFile -Force
    }

    Invoke-CheckedCommand -Executable "firebase" -Arguments @(
      "deploy", "--only", "functions", "--project", $ProjectId
    ) -Description "Restore functions deployment after failure test"
  } catch {
    $restoreFailed = $true
    Write-Error "Failed to restore environment/deployment: $($_.Exception.Message)"
  } finally {
    if ([string]::IsNullOrEmpty($allowSameAliasBefore)) {
      Remove-Item Env:ALLOW_SAME_PROJECT_ALIAS -ErrorAction SilentlyContinue
    } else {
      $env:ALLOW_SAME_PROJECT_ALIAS = $allowSameAliasBefore
    }

    if ([string]::IsNullOrEmpty($allowProdUnsafeBefore)) {
      Remove-Item Env:ALLOW_PROD_UNSAFE_CONVERTER_ENDPOINT -ErrorAction SilentlyContinue
    } else {
      $env:ALLOW_PROD_UNSAFE_CONVERTER_ENDPOINT = $allowProdUnsafeBefore
    }
  }
}

if ($restoreFailed) {
  throw "Failure E2E executed but restoration failed. Check logs above."
}
