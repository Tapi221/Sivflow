param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,
  [string]$Bucket = "",
  [string]$Uid = "e2e-pptx-user",
  [int]$Slides = 3,
  [int]$TimeoutSeconds = 120,
  [string]$CredentialsFile = ""
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

function Invoke-CapturedExternal {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )
  $output = & $Command 2>&1
  $exitCode = $LASTEXITCODE
  if ($output) {
    $output | ForEach-Object { Write-Host $_ }
  }
  if ($exitCode -ne 0) {
    throw "$Label failed with exit code $exitCode"
  }
  return @($output)
}

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Require-Command -Name "node"
Require-Command -Name "gsutil"
Require-Command -Name "gcloud"

if ($Slides -lt 1 -or $Slides -gt 10) {
  throw "Slides must be between 1 and 10."
}

if ($TimeoutSeconds -lt 30 -or $TimeoutSeconds -gt 600) {
  throw "TimeoutSeconds must be between 30 and 600."
}

if ([string]::IsNullOrWhiteSpace($Bucket)) {
  $Bucket = "$ProjectId.firebasestorage.app"
}

$resolvedCredentials = ""
if (-not [string]::IsNullOrWhiteSpace($CredentialsFile)) {
  $resolvedCredentials = (Resolve-Path $CredentialsFile).Path
} elseif (-not [string]::IsNullOrWhiteSpace($env:GOOGLE_APPLICATION_CREDENTIALS) -and (Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS)) {
  $resolvedCredentials = (Resolve-Path $env:GOOGLE_APPLICATION_CREDENTIALS).Path
} elseif (Test-Path "serviceAccountKey.json") {
  $resolvedCredentials = (Resolve-Path "serviceAccountKey.json").Path
}

if (-not [string]::IsNullOrWhiteSpace($resolvedCredentials)) {
  Set-Item -Path "Env:GOOGLE_APPLICATION_CREDENTIALS" -Value $resolvedCredentials
  Write-Host "[auth] using GOOGLE_APPLICATION_CREDENTIALS=$resolvedCredentials"
} else {
  & gcloud auth application-default print-access-token | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "No ADC found. Run 'gcloud auth application-default login' or pass -CredentialsFile."
  }
  Write-Host "[auth] using application-default credentials"
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$docId = "e2e-pptx-real-$timestamp"
$tmpRoot = Join-Path $env:TEMP "flashcardmaster-pptx-e2e"
$tmpDir = Join-Path $tmpRoot $docId
$samplePath = Join-Path $tmpDir "sample.pptx"
$sourceStoragePath = "users/$Uid/documents/$docId/source.pptx"
$expectedManifestPath = "users/$Uid/documents/$docId/pptx/manifest.json"

New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

Write-Host "[1/6] generating sample PPTX"
Invoke-External -Label "generate sample PPTX" -Command {
  node scripts/generate-sample-pptx.mjs --out $samplePath --slides $Slides
}

Write-Host "[2/6] uploading source PPTX to GCS"
Invoke-External -Label "gsutil cp source PPTX" -Command {
  gsutil cp $samplePath "gs://$Bucket/$sourceStoragePath"
}

Write-Host "[3/6] seeding Firestore document + conversion queue"
$seedEnv = @{
  E2E_PROJECT_ID = $ProjectId
  E2E_UID = $Uid
  E2E_DOC_ID = $docId
  E2E_SOURCE_STORAGE_PATH = $sourceStoragePath
}
$seedScript = @'
const admin = require("firebase-admin");
const projectId = process.env.E2E_PROJECT_ID;
const uid = process.env.E2E_UID;
const docId = process.env.E2E_DOC_ID;
const sourceStoragePath = process.env.E2E_SOURCE_STORAGE_PATH;

if (!projectId || !uid || !docId || !sourceStoragePath) {
  throw new Error("seed env missing");
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const firestore = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();
const documentRef = firestore.doc(`users/${uid}/documents/${docId}`);
const conversionRef = firestore.doc(`users/${uid}/pptxConversions/${docId}`);

(async () => {
  await documentRef.set(
    {
      id: docId,
      userId: uid,
      kind: "pptx",
      title: `E2E PPTX ${docId}`,
      fileName: "sample.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      storagePath: sourceStoragePath,
      uploadStatus: "ready",
      convertStatus: "processing",
      pptxManifestStatus: "queued",
      pptxManifestPath: null,
      pptxSlideCount: null,
      pptxLastError: null,
      pptxConvertRequestedAt: now,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    { merge: true }
  );

  await conversionRef.set(
    {
      docId,
      uid,
      sourceStoragePath,
      status: "queued",
      requestOrigin: "e2e-script",
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  console.log("seeded");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@
foreach ($entry in $seedEnv.GetEnumerator()) {
  Set-Item -Path "Env:$($entry.Key)" -Value $entry.Value
}
Invoke-CapturedExternal -Label "seed Firestore docs" -Command {
  $seedScript | node -
} | Out-Null

Write-Host "[4/6] polling conversion status"
$pollEnv = @{
  E2E_PROJECT_ID = $ProjectId
  E2E_BUCKET = $Bucket
  E2E_UID = $Uid
  E2E_DOC_ID = $docId
  E2E_EXPECTED_MANIFEST_PATH = $expectedManifestPath
  E2E_TIMEOUT_SECONDS = "$TimeoutSeconds"
}
$pollScript = @'
const admin = require("firebase-admin");

const projectId = process.env.E2E_PROJECT_ID;
const bucketName = process.env.E2E_BUCKET;
const uid = process.env.E2E_UID;
const docId = process.env.E2E_DOC_ID;
const expectedManifestPath = process.env.E2E_EXPECTED_MANIFEST_PATH;
const timeoutSeconds = Number(process.env.E2E_TIMEOUT_SECONDS || "120");

if (!projectId || !bucketName || !uid || !docId || !expectedManifestPath) {
  throw new Error("poll env missing");
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId, storageBucket: bucketName });
}

const firestore = admin.firestore();
const bucket = admin.storage().bucket(bucketName);
const conversionRef = firestore.doc(`users/${uid}/pptxConversions/${docId}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

const main = async () => {
  const startedAt = Date.now();
  const sequence = [];
  let finalData = null;

  while (Date.now() - startedAt < timeoutSeconds * 1000) {
    const snap = await conversionRef.get();
    if (!snap.exists) {
      await sleep(1500);
      continue;
    }
    const data = snap.data() || {};
    finalData = data;
    const status = normalize(data.status) || "unknown";
    if (sequence[sequence.length - 1] !== status) {
      sequence.push(status);
      console.log(`STATUS=${status}`);
    }

    if (status === "ready") {
      const manifestPath = normalize(data.manifestPath);
      if (manifestPath !== expectedManifestPath) {
        throw new Error(`manifest_path_unexpected:${manifestPath}`);
      }

      const manifestFile = bucket.file(manifestPath);
      const [manifestExists] = await manifestFile.exists();
      if (!manifestExists) {
        throw new Error(`manifest_not_found:${manifestPath}`);
      }

      const [manifestBytes] = await manifestFile.download();
      let manifest;
      try {
        manifest = JSON.parse(manifestBytes.toString("utf8"));
      } catch {
        throw new Error("manifest_invalid_json");
      }

      const slideCount = Number(manifest.slideCount);
      const slides = Array.isArray(manifest.slides) ? manifest.slides : [];
      if (!Number.isFinite(slideCount) || slideCount <= 0) {
        throw new Error("manifest_slide_count_invalid");
      }
      if (slides.length !== slideCount) {
        throw new Error(`manifest_slide_mismatch:${slides.length}:${slideCount}`);
      }

      for (const slide of slides) {
        const path = normalize(slide?.path);
        if (!path) {
          throw new Error("manifest_slide_path_missing");
        }
        const [exists] = await bucket.file(path).exists();
        if (!exists) {
          throw new Error(`slide_not_found:${path}`);
        }
      }

      console.log(`DOC_ID=${docId}`);
      console.log(`STATUS_SEQUENCE=${sequence.join("->")}`);
      console.log("FINAL_STATUS=ready");
      console.log(`MANIFEST_PATH=${manifestPath}`);
      console.log(`SLIDE_COUNT=${slideCount}`);
      return;
    }

    if (status === "failed") {
      const errorMessage = normalize(data.errorMessage) || "unknown_error";
      console.log(`DOC_ID=${docId}`);
      console.log(`STATUS_SEQUENCE=${sequence.join("->")}`);
      console.log("FINAL_STATUS=failed");
      console.log(`ERROR_MESSAGE=${errorMessage}`);
      process.exit(1);
    }

    await sleep(2000);
  }

  const lastStatus = normalize(finalData?.status) || "timeout";
  const errorMessage = normalize(finalData?.errorMessage) || "timeout";
  console.log(`DOC_ID=${docId}`);
  console.log(`STATUS_SEQUENCE=${sequence.join("->")}`);
  console.log(`FINAL_STATUS=${lastStatus}`);
  console.log(`ERROR_MESSAGE=${errorMessage}`);
  process.exit(1);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
'@
foreach ($entry in $pollEnv.GetEnumerator()) {
  Set-Item -Path "Env:$($entry.Key)" -Value $entry.Value
}
$pollOutput = Invoke-CapturedExternal -Label "poll conversion status" -Command {
  $pollScript | node -
}

$sequenceLine = $pollOutput | Where-Object { $_ -match '^STATUS_SEQUENCE=' } | Select-Object -Last 1
$finalStatusLine = $pollOutput | Where-Object { $_ -match '^FINAL_STATUS=' } | Select-Object -Last 1
$manifestPathLine = $pollOutput | Where-Object { $_ -match '^MANIFEST_PATH=' } | Select-Object -Last 1

if (-not $finalStatusLine -or $finalStatusLine -notmatch '^FINAL_STATUS=ready$') {
  throw "E2E did not finish in ready state."
}

if (-not $manifestPathLine) {
  throw "MANIFEST_PATH was not produced by poll script."
}

$manifestPath = $manifestPathLine -replace '^MANIFEST_PATH=', ''
if ($manifestPath -ne $expectedManifestPath) {
  throw "Unexpected manifest path: $manifestPath"
}

$manifestGsPath = "gs://$Bucket/$manifestPath"
Write-Host "[5/6] validating manifest/slides via gsutil"
$manifestJsonLines = Invoke-CapturedExternal -Label "gsutil cat manifest" -Command {
  gsutil cat $manifestGsPath
}
$manifestJsonText = ($manifestJsonLines -join "`n").Trim()
if ([string]::IsNullOrWhiteSpace($manifestJsonText)) {
  throw "Manifest JSON is empty."
}

$manifestObject = $manifestJsonText | ConvertFrom-Json
$slideCountFromField = [int]$manifestObject.slideCount
$slidesArray = @($manifestObject.slides)
if ($slideCountFromField -le 0) {
  throw "Manifest slideCount is invalid: $slideCountFromField"
}
if ($slidesArray.Count -ne $slideCountFromField) {
  throw "Manifest slideCount mismatch. slideCount=$slideCountFromField slides.Length=$($slidesArray.Count)"
}

foreach ($slide in $slidesArray) {
  if ([string]::IsNullOrWhiteSpace($slide.path)) {
    throw "Manifest slide path is missing."
  }
  Invoke-External -Label "gsutil ls slide $($slide.path)" -Command {
    gsutil ls "gs://$Bucket/$($slide.path)"
  }
}

Write-Host "[6/6] conversion completed and validated"
Write-Host "DOC_ID=$docId"
if ($sequenceLine) { Write-Host $sequenceLine }
Write-Host "FINAL_STATUS=ready"
Write-Host "MANIFEST_PATH=$manifestPath"
Write-Host "SLIDE_COUNT=$slideCountFromField"
