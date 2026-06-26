# Sivflow Cloud Run setup

Sivflow は Firebase Hosting を静的フロント配信に残し、`/api/**` を Cloud Run の `sivflow-api` へ流します。

```txt
Firebase Hosting
  /api/** -> Cloud Run: sivflow-api
  /**     -> dist/index.html

Cloud Run: sivflow-api
  -> Cloud SQL for PostgreSQL
```

## 追加された入口

Cloud Run 用の Node.js サーバーは `functions/src/cloudRunServer.ts` です。

- `GET /api/healthz`: Cloud Run コンテナの起動確認
- `GET /api/readyz`: `DATABASE_URL` の Postgres へ `select 1` を投げる疎通確認
- `GET /api`: サービス状態の簡易確認

既存の Firebase callable functions はすぐ消さず、Google Calendar 連携やシラバスクローラーを段階的に `/api/**` へ移します。

## 事前準備

Artifact Registry の Docker repository を作ります。

```bash
gcloud artifacts repositories create sivflow \
  --repository-format=docker \
  --location=asia-northeast1
```

`DATABASE_URL` は Secret Manager に入れます。

```bash
printf '%s' 'postgresql://USER:PASSWORD@HOST:5432/DATABASE' | \
  gcloud secrets create DATABASE_URL --data-file=-
```

Cloud SQL の Unix socket を使う場合は、`DATABASE_URL` を Cloud SQL 接続方式に合わせて作り、deploy 時に `_CLOUD_SQL_INSTANCE` を渡します。

## Cloud Run へデプロイ

Cloud Build で image build、push、Cloud Run deploy をまとめて実行します。

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _REGION=asia-northeast1,_SERVICE=sivflow-api,_AR_REPOSITORY=sivflow,_DATABASE_URL_SECRET=DATABASE_URL,_CLOUD_SQL_INSTANCE=PROJECT_ID:asia-northeast1:INSTANCE_NAME
```

Cloud SQL を使わない疎通確認だけなら `_CLOUD_SQL_INSTANCE` は空のままで構いません。

```bash
gcloud builds submit --config cloudbuild.yaml
```

## Hosting へ反映

`firebase.json` では `/api` と `/api/**` を Cloud Run の `sivflow-api` へ rewrite します。Cloud Run を先に deploy してから Hosting を deploy します。

```bash
npm run build
firebase deploy --only hosting
```

確認:

```bash
curl https://YOUR_HOSTING_DOMAIN/api/healthz
curl https://YOUR_HOSTING_DOMAIN/api/readyz
```

## 今後移すもの

1. `functions/src/gcal/oauthCallables.ts` の Google Calendar 保存処理を `/api/google-calendar/*` へ移す
2. `functions/src/timetable/syllabusCrawler.ts` の crawler 実行 API を `/api/timetable/*` へ移す
3. Postgres 保存を Cloud Run 側に寄せた後、Firebase Functions の同等 endpoint を整理する
