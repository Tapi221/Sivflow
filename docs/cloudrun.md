# Sivflow Cloud Run setup

Sivflow は Firebase Hosting を静的フロント配信に残し、`/api/**` を Cloud Run の `sivflow-api` へ流します。

```txt
Firebase Hosting
  /api/** -> Cloud Run: sivflow-api
  /**     -> dist/index.html

Cloud Run: sivflow-api
  -> Cloud SQL for PostgreSQL
```

## Cloud Run API

Cloud Run 用の Node.js サーバーは `functions/src/cloudRunServer.ts` です。

- `GET /api/healthz`: Cloud Run コンテナの起動確認
- `GET /api/readyz`: `DATABASE_URL` の Postgres へ `select 1` を投げる疎通確認
- `GET /api`: サービス状態の簡易確認
- `GET /api/google-calendar/accounts`: Firebase ID token のユーザーに紐づく Google Calendar アカウント一覧
- `POST /api/google-calendar/connect`: Google OAuth code を交換し、refresh token を Postgres に保存
- `POST /api/google-calendar/token`: Postgres の refresh token から access token を再発行
- `POST /api/google-calendar/disconnect`: Postgres から Google Calendar アカウントを削除
- `DELETE /api/google-calendar/accounts/:accountId`: Postgres から Google Calendar アカウントを削除
- `POST /api/google-calendar/custom-token`: Firebase custom token を発行
- `POST /api/timetable/syllabus/crawl`: 指定URLをクロールして `timetable_syllabus_*` に保存
- `POST /api/timetable/syllabus/sources`: 管理者用のクロール元 upsert
- `POST /api/timetable/syllabus/run-catalog-crawl`: 管理者用のカタログクロール実行

`/api/google-calendar/*` と `/api/timetable/*` は `Authorization: Bearer <Firebase ID token>` を要求します。管理者APIは Firebase Auth の `admin` custom claim が必要です。

既存の Firebase callable functions は互換用として残していますが、保存先は Postgres に統一しています。

## npm scripts

ルートから npm で実行します。

```bash
npm run build:cloudrun
npm run deploy:cloudrun
npm run deploy:hosting
```

## 事前準備

Artifact Registry の Docker repository を作ります。

```bash
gcloud artifacts repositories create sivflow \
  --repository-format=docker \
  --location=asia-northeast1
```

Cloud Run が使う値は Secret Manager に入れます。

```bash
printf '%s' 'postgresql://USER:PASSWORD@HOST:5432/DATABASE' | \
  gcloud secrets create DATABASE_URL --data-file=-
```

PowerShell の場合は次の形で入れます。

```powershell
'postgresql://USER:PASSWORD@HOST:5432/DATABASE' | gcloud secrets create DATABASE_URL --data-file=-
```

Google OAuth 用の Secret Manager secret も Cloud Run に渡します。

```txt
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY
```

Cloud SQL の Unix socket を使う場合は、`DATABASE_URL` を Cloud SQL 接続方式に合わせて作り、deploy 時に `_CLOUD_SQL_INSTANCE` を渡します。

## Cloud Run へデプロイ

Cloud Build で image build、push、Cloud Run deploy をまとめて実行します。

```bash
npm run deploy:cloudrun
```

Cloud SQL instance を明示する場合は、npm の `--` 以降に Cloud Build の substitutions を渡します。

```bash
npm run deploy:cloudrun -- \
  --substitutions _REGION=asia-northeast1,_SERVICE=sivflow-api,_AR_REPOSITORY=sivflow,_DATABASE_URL_SECRET=DATABASE_URL,_CLOUD_SQL_INSTANCE=PROJECT_ID:asia-northeast1:INSTANCE_NAME
```

Cloud SQL を使わない疎通確認だけなら `_CLOUD_SQL_INSTANCE` は空のままで構いません。`cloudbuild.yaml` は未指定の場合、`--add-cloudsql-instances` を付けずに deploy します。

## Hosting へ反映

`firebase.json` では `/api` と `/api/**` を Cloud Run の `sivflow-api` へ rewrite します。Cloud Run を先に deploy してから Hosting を deploy します。

```bash
npm run deploy:hosting
```

確認:

```bash
curl https://YOUR_HOSTING_DOMAIN/api/healthz
curl https://YOUR_HOSTING_DOMAIN/api/readyz
```
