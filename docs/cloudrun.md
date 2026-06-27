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

- `GET /api/healthz`: Cloud Run の起動確認
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

`build:cloudrun` は `functions` の TypeScript build だけを実行します。
`deploy:cloudrun` は `cloudbuild.yaml` から Cloud Run のソースデプロイを実行します。

## 事前準備

Cloud Run が使う値は Secret Manager または Cloud Run の環境変数で設定します。

必要な値:

```txt
DATABASE_URL
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY
```

Cloud SQL の Unix socket を使う場合は、`DATABASE_URL` を Cloud SQL 接続方式に合わせて作り、Cloud Run サービスに Cloud SQL instance を接続してください。

## Cloud Run へデプロイ

ソースから Cloud Run にデプロイします。

```bash
npm run deploy:cloudrun
```

リージョンやサービス名を変える場合は、npm の `--` 以降に Cloud Build の substitutions を渡します。

```bash
npm run deploy:cloudrun -- \
  --substitutions _REGION=asia-northeast1,_SERVICE=sivflow-api,_SOURCE=functions
```

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
