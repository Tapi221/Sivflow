# PPTX Converter Service

Cloud Run 向けの PPTX 実変換サービスです。  
`POST /convert` で受け取った PPTX を `LibreOffice -> PDF -> PNG` へ変換し、`manifest.json` を GCS に保存します。

## Fonts（日本語/CJK）

LibreOffice の PPTX→PDF 変換は、コンテナにインストールされたフォントに依存してフォント置換を行います。
日本語/CJK フォントが無い場合、出力 PDF/PNG で以下が発生し得ます。

- 日本語が「□」などの欠落グリフになる（豆腐）
- 代替フォントにより文字幅が変わり、改行・折返し・レイアウトが崩れる

Dockerfile では CJK を広くカバーする `fonts-noto-cjk` を同梱しています。
動作確認は以下で行えます。

```bash
fc-list | grep -i "Noto Sans CJK" || true
fc-match "Noto Sans CJK JP" || true
```

## Request

`POST /convert` (or `POST /`)

```json
{
  "userId": "uid",
  "docId": "document-id",
  "sourceStoragePath": "users/uid/documents/document-id/source.pptx"
}
```

必須ヘッダ:

- `x-pptx-converter-token: <token>`

## Response

成功:

```json
{
  "manifestPath": "users/uid/documents/document-id/pptx/manifest.json",
  "slideCount": 10,
  "fallbackPdfPath": null
}
```

失敗:

```json
{
  "error": "source_scope_violation"
}
```

## Environment Variables

- `PPTX_CONVERTER_TOKEN` (required)
- `PPTX_STORAGE_BUCKET` (optional, default: `<projectId>.firebasestorage.app`)
- `PPTX_MAX_SLIDES` (optional, default: `200`)
- `PPTX_CONVERSION_DPI` (optional, default: `160`)
- `PPTX_COMMAND_TIMEOUT_MS` (optional, default: `120000`)

## Local Run

```bash
cd services/pptx-converter
npm install
PPTX_CONVERTER_TOKEN=local-dev-token npm start
```

## Docker Build

```bash
cd services/pptx-converter
docker build -t pptx-converter:local .
```

## Cloud Run Deploy Example

```bash
gcloud run deploy pptx-converter \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --timeout 120 \
  --set-secrets PPTX_CONVERTER_TOKEN=PPTX_CONVERTER_TOKEN:latest
```

公開は最小化することを推奨します。最低でもネットワーク制限とトークンを併用してください。

## Functions Side Env

`onPptxConversionQueued` からこのサービスを呼ぶため、Functions 側に endpoint を設定します。

`functions/.env.<projectId>`

```dotenv
PPTX_CONVERTER_ENDPOINT=https://<your-cloud-run-host>/convert
PPTX_CONVERTER_IMPLEMENTATION=real
```
