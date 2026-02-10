# PPTX Real Converter Operations

このドキュメントは `services/pptx-converter` を Cloud Run で運用し、Functions の `onPptxConversionQueued` から real converter 経路を使うための手順です。

## 1. Cloud Run Deploy

PowerShell:

```powershell
.\scripts\deploy-pptx-converter.ps1 -ProjectId <project-id>
```

主なデフォルト:

- region: `us-central1`
- service: `pptx-converter`
- memory: `2Gi`
- cpu: `1`
- timeout: `120s`
- env:
  - `PPTX_MAX_SLIDES=200`
  - `PPTX_CONVERSION_DPI=160`
  - `PPTX_COMMAND_TIMEOUT_MS=120000`
- secret:
  - `PPTX_CONVERTER_TOKEN` (`latest`)

デプロイ成功時に出力される:

- Cloud Run base URL
- Converter endpoint URL (`<base>/convert`)

## 2. Functions Endpoint Setting

Cloud Run URL を Functions の env に反映:

```powershell
.\scripts\set-pptx-converter-endpoint.ps1 -ProjectId <project-id> -Endpoint https://<cloud-run-host>/convert
```

このスクリプトは以下を強制します:

- `PPTX_CONVERTER_ENDPOINT=<.../convert>`
- `PPTX_CONVERTER_IMPLEMENTATION=real`

`functions/.env.<project-id>` の差分を表示します。

## 3. Functions Deploy

```powershell
firebase use <alias-or-project>
firebase deploy --only functions
```

`.firebaserc` で `staging` / `prod` が同じ project を向いている場合は `predeploy-check` がブロックします。

緊急時 override:

```powershell
$env:ALLOW_SAME_PROJECT_ALIAS="1"
firebase deploy --only functions
```

本番運用では基本的に override を使わないでください。

## 4. Real Converter E2E

```powershell
.\scripts\e2e-pptx-real.ps1 -ProjectId <project-id>
```

処理内容:

1. 本物のサンプル PPTX を生成 (`scripts/generate-sample-pptx.mjs`)
2. `gs://<bucket>/users/<uid>/documents/<docId>/source.pptx` にアップロード
3. Firestore:
   - `users/<uid>/documents/<docId>`
   - `users/<uid>/pptxConversions/<docId> (status=queued)`
4. `queued -> processing -> ready` をポーリング検証
5. `manifest.json` と `slides/*.png` の存在検証

成功時の出力:

- `DOC_ID`
- `STATUS_SEQUENCE`
- `FINAL_STATUS`
- `MANIFEST_PATH`
- `SLIDE_COUNT`

認証:

- 既定で `serviceAccountKey.json` があればそれを使います
- なければ ADC (`gcloud auth application-default login`) が必要です
- 明示指定する場合:

```powershell
.\scripts\e2e-pptx-real.ps1 -ProjectId <project-id> -CredentialsFile <path-to-service-account-json>
```

A〜D の再現方針:

- A (オンライン正常): `e2e-pptx-real.ps1` で `queued->processing->ready` を確認
- B (オフライン): ブラウザ DevTools を offline にして UI で conversion が発行されないことを確認
- C (変換失敗): `PPTX_CONVERTER_ENDPOINT` を意図的に無効 URL に切替えて `failed` を確認
- D (リロード耐性): A で ready 化した doc を UI で再読み込みし manifest 復元表示を確認

## 5. predeploy-check Overrides

`scripts/predeploy-check.mjs` で使用できる環境変数:

- `ALLOW_SAME_PROJECT_ALIAS=1`
- `ALLOW_PLACEHOLDER_IN_PROD=1`
- `ALLOW_CLOUDFUNCTIONS_PPTX_ENDPOINT_IN_PROD=1`
- `ALLOW_EMPTY_PPTX_CONVERTER_ENDPOINT_IN_PROD=1`

原則:

- 通常運用では使わない
- 使った場合は、理由と期間を必ず記録する

## 6. IAM Note

Cloud Run 実行 SA に GCS 読み書き権限が無い場合、変換は失敗します。  
`deploy-pptx-converter.ps1` は以下の確認用コマンドを表示します（自動実行しません）。

```powershell
gcloud projects add-iam-policy-binding <project-id> --member="serviceAccount:<service-account>" --role="roles/storage.objectAdmin"
```
