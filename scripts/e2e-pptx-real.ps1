param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Bucket = "",
  [string]$Uid = "e2e-pptx-user",
  [int]$Slides = 3,
  [int]$PollTimeoutSeconds = 120,
  [int]$PollIntervalSeconds = 4
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

function Get-EnvValueFromFile {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string]$Key
  )

  if (-not (Test-Path $FilePath)) { return $null }
  foreach ($line in Get-Content $FilePath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    if ($trimmed -match "^\s*$([regex]::Escape($Key))\s*=\s*(.*)$") {
      $value = $Matches[1]
      if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      ) {
        return $value.Substring(1, $value.Length - 2)
      }
      return $value
    }
  }
  return $null
}

function Invoke-NodeJson {
  param(
    [Parameter(Mandatory = $true)][string]$ScriptContent,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $repoTmpDir = ".tmp"
  New-Item -Path $repoTmpDir -ItemType Directory -Force | Out-Null
  $tmpFile = Join-Path $repoTmpDir ("pptx-e2e-" + [Guid]::NewGuid().ToString("N") + ".cjs")
  try {
    Set-Content -Path $tmpFile -Value $ScriptContent -Encoding utf8
    $output = & node $tmpFile @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Node helper failed: $tmpFile"
    }
    $jsonText = ($output -join "`n").Trim()
    if (-not $jsonText) {
      throw "Node helper returned empty output."
    }
    return $jsonText | ConvertFrom-Json -Depth 20
  } finally {
    if (Test-Path $tmpFile) {
      Remove-Item $tmpFile -Force
    }
  }
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

$envFile = "functions/.env.$ProjectId"
$converterEndpoint = Get-EnvValueFromFile -FilePath $envFile -Key "PPTX_CONVERTER_ENDPOINT"
if (-not $converterEndpoint) {
  throw "PPTX_CONVERTER_ENDPOINT が $envFile に設定されていません。"
}

# D: unauth direct access must be blocked before running full E2E.
$unauthPayload = @{
  userId = "unauth-check"
  docId = "unauth-check"
  sourceStoragePath = "users/unauth-check/documents/unauth-check/source.pptx"
} | ConvertTo-Json -Compress
$unauthResponse = Invoke-WebRequest -Uri $converterEndpoint -Method Post -ContentType "application/json" -Body $unauthPayload -SkipHttpErrorCheck
if ($unauthResponse.StatusCode -ne 401 -and $unauthResponse.StatusCode -ne 403) {
  throw "Unauthenticated direct access to converter was not blocked. status=$($unauthResponse.StatusCode)"
}
Write-Host "Unauth direct check passed: status=$($unauthResponse.StatusCode)"

$docId = [Guid]::NewGuid().ToString("N")
$sourceStoragePath = "users/$Uid/documents/$docId/source.pptx"
$expectedManifestPath = "users/$Uid/documents/$docId/pptx/manifest.json"
$tmpDir = Join-Path $env:TEMP "pptx-e2e-$docId"
$samplePath = Join-Path $tmpDir "sample.pptx"
New-Item -Path $tmpDir -ItemType Directory -Force | Out-Null

Invoke-CheckedCommand -Executable "node" -Arguments @(
  "scripts/generate-sample-pptx.mjs",
  "--out", $samplePath,
  "--slides", [string]$Slides
) -Description "Generate sample PPTX"

Invoke-CheckedCommand -Executable "gsutil" -Arguments @(
  "cp",
  $samplePath,
  "gs://$Bucket/$sourceStoragePath"
) -Description "Upload sample PPTX to GCS"

$seedScript = @'
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const [projectId, uid, docId, sourceStoragePath] = process.argv.slice(2);
if (!projectId || !uid || !docId || !sourceStoragePath) {
  throw new Error("missing_args");
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

(async () => {
  const now = FieldValue.serverTimestamp();
  await db.doc(`users/${uid}/documents/${docId}`).set(
    {
      id: docId,
      userId: uid,
      kind: "pptx",
      title: `E2E ${docId}.pptx`,
      fileName: `E2E ${docId}.pptx`,
      storagePath: sourceStoragePath,
      uploadStatus: "ready",
      pptxManifestStatus: "queued",
      convertStatus: "queued",
      createdAt: now,
      updatedAt: now,
      isDeleted: false
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
if (!projectId || !uid || !docId) {
  throw new Error("missing_args");
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

(async () => {
  const snap = await admin.firestore().doc(`users/${uid}/pptxConversions/${docId}`).get();
  if (!snap.exists) {
    console.log(JSON.stringify({ exists: false }));
    return;
  }
  const data = snap.data() || {};
  console.log(
    JSON.stringify({
      exists: true,
      status: data.status || null,
      manifestPath: data.manifestPath || null,
      slideCount: data.slideCount ?? null,
      errorMessage: data.errorMessage || null
    })
  );
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
$manifestPath = [string]$latest.manifestPath
$errorMessage = [string]$latest.errorMessage

if ($finalStatus -ne "ready") {
  Write-Host "DOC_ID=$docId"
  Write-Host "STATUS_SEQUENCE=$($statusSequence -join '>')"
  Write-Host "FINAL_STATUS=$finalStatus"
  Write-Host "ERROR_MESSAGE=$errorMessage"
  throw "Expected ready but got $finalStatus"
}

if ($manifestPath -ne $expectedManifestPath) {
  throw "Unexpected manifestPath. expected=$expectedManifestPath actual=$manifestPath"
}

$manifestRaw = & gsutil cat "gs://$Bucket/$manifestPath"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to read manifest from gs://$Bucket/$manifestPath"
}
$manifestJson = ($manifestRaw -join "`n") | ConvertFrom-Json -Depth 50
$manifestSlideCount = [int]$manifestJson.slideCount
$slides = @($manifestJson.slides)
if ($manifestSlideCount -ne $slides.Count) {
  throw "Manifest slideCount mismatch. slideCount=$manifestSlideCount slides.length=$($slides.Count)"
}

foreach ($slide in $slides) {
  if (-not $slide.path) {
    throw "Manifest contains slide without path."
  }
  & gsutil ls "gs://$Bucket/$($slide.path)" *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Slide object does not exist: gs://$Bucket/$($slide.path)"
  }
}

Write-Host ""
Write-Host "DOC_ID=$docId"
Write-Host "STATUS_SEQUENCE=$($statusSequence -join '>')"
Write-Host "FINAL_STATUS=$finalStatus"
Write-Host "MANIFEST_PATH=$manifestPath"
Write-Host "SLIDE_COUNT=$manifestSlideCount"
