# PPTX Real Converter Operations

This document describes the production-safe operation for the PPTX real converter pipeline:

- Firestore trigger: `onPptxConversionQueued`
- Cloud Run converter: `/convert`
- Storage output: `users/{uid}/documents/{docId}/pptx/...`

## Architecture (IAM-first)

- Runtime service account (Cloud Run): `pptx-converter-runtime@<project>.iam.gserviceaccount.com`
  - Required role: `roles/storage.objectAdmin` (minimum practical role for read/write object flow)
- Invoker service account (Functions): `onPptxConversionQueued` runtime SA
  - Required role on Cloud Run service: `roles/run.invoker`
- Converter auth headers:
  - `Authorization: Bearer <ID_TOKEN>` (audience = Cloud Run URL)
  - `x-pptx-converter-token: <secret>` (defense-in-depth)

## Deploy Cloud Run Converter

```powershell
pwsh ./scripts/deploy-pptx-converter.ps1 `
  -ProjectId <project-id> `
  -Region us-central1 `
  -ServiceName pptx-converter
```

The script:

1. Validates `PPTX_CONVERTER_TOKEN` secret exists.
2. Creates/uses dedicated runtime SA.
3. Deploys Cloud Run without unauthenticated access.
4. Grants `roles/run.invoker` to Functions SA.
5. Prints converter endpoint URL (`.../convert`).

## Configure Functions Endpoint

```powershell
pwsh ./scripts/set-pptx-converter-endpoint.ps1 `
  -ProjectId <project-id> `
  -Endpoint https://<service-hash>-<region>.a.run.app/convert
```

This updates `functions/.env.<project-id>` with:

- `PPTX_CONVERTER_ENDPOINT=<.../convert>`
- `PPTX_CONVERTER_IMPLEMENTATION=real`

Then deploy Functions:

```powershell
firebase deploy --only functions --project <project-id>
```

## Predeploy Guard

`firebase.json` runs:

```txt
node ./scripts/predeploy-check.mjs
```

Current checks:

- blocks when `staging` and `prod` aliases point to same project (unless override)
- blocks unsafe prod endpoint (`localhost`, `127.0.0.1`, placeholder `cloudfunctions.net/.../pptxConverterEndpoint`)
- validates active project resolution for both alias and `--project` flows

Overrides (use only with incident ticket):

- `ALLOW_SAME_PROJECT_ALIAS=1`
- `ALLOW_PROD_UNSAFE_CONVERTER_ENDPOINT=1`

## E2E (A-D)

## A + D: success path + reload durability precondition

```powershell
pwsh ./scripts/e2e-pptx-real.ps1 -ProjectId <project-id> -CredentialsFile <path-to-service-account.json>
```

What it verifies:

1. unauth direct call to `/convert` is rejected (`401` or `403`)
2. sample PPTX upload
3. `queued -> processing -> ready`
4. manifest and slides exist in GCS
5. outputs:
   - `DOC_ID`
   - `STATUS_SEQUENCE`
   - `FINAL_STATUS`
   - `MANIFEST_PATH`
   - `SLIDE_COUNT`

Credential resolution order for the E2E scripts:

1. `-CredentialsFile <path>`
2. `GOOGLE_APPLICATION_CREDENTIALS`
3. `./serviceAccountKey.json` (repo root auto-detect)
4. ADC (`gcloud auth application-default login`)

## C: failure path

```powershell
pwsh ./scripts/e2e-pptx-failure.ps1 -ProjectId <project-id> -CredentialsFile <path-to-service-account.json>
```

What it verifies:

1. temporarily points endpoint to unreachable URL
2. deploys Functions
3. conversion transitions to `failed`
4. `errorMessage` is `converter_http_*`
5. restores env and re-deploys Functions automatically

## B: browser offline behavior

Offline UX is validated from app UI (DevTools Network offline):

1. drop PPTX while offline
2. no conversion request is emitted
3. UI remains stable and original file action remains available

## Monitoring and Logs

Check status transitions:

- Firestore: `/users/{uid}/pptxConversions/{docId}`
  - `status`, `errorMessage`, `manifestPath`, `slideCount`

Check Functions logs:

```powershell
firebase functions:log --project <project-id> --only onPptxConversionQueued
```

Check Cloud Run logs:

```powershell
gcloud run services logs read pptx-converter --project <project-id> --region us-central1 --limit 200
```

Track minimum SLO signals:

- conversion success rate (`ready / total`)
- timeout ratio (`converter_timeout_*`)
- upstream HTTP failure ratio (`converter_http_*`)
