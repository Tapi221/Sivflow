# Sivflow Cloud Run setup

Sivflow は Firebase Hosting を静的フロント配信に残し、Cloud Run の `sivflow-api` に本体バックエンドを載せます。

```txt
Firebase Hosting
  /api/**       -> Cloud Run: sivflow-api
  /graphql     -> Cloud Run: sivflow-api
  /oauth/**    -> Cloud Run: sivflow-api
  /socket.io/** -> Cloud Run: sivflow-api
  /**          -> dist/index.html

Cloud Run: sivflow-api
  -> @affine/server
  -> Cloud SQL for PostgreSQL
  -> Redis / Memorystore
```

## Cloud Run API

Cloud Run では `@affine/server` を `SERVER_FLAVOR=allinone` で起動します。これにより、クラウドワークスペース作成に必要な GraphQL と同期系のエンドポイントを同じサービスで処理します。

主なエンドポイント:

- `POST /graphql`: ワークスペース作成、認証、設定などの GraphQL API
- `/socket.io/**`: ワークスペース同期・リアルタイム通信
- `/oauth/**`: OAuth コールバック
- `/api/**`: 本体バックエンドが提供する HTTP API

以前の軽量 Cloud Run API は `nouse/functions` 配下に退避されています。Google Calendar や timetable 用の独自 API を残したい場合は、別の Cloud Run サービスに分けて Hosting rewrite も分離してください。

## npm scripts

ルートから npm で実行します。

```bash
npm run build:cloudrun
npm run deploy:cloudrun
npm run deploy:hosting
npm run deploy:hosting:only
```

`build:cloudrun` は本体バックエンド `@affine/server` をビルドします。
`deploy:cloudrun` は `cloudbuild.yaml` から `Dockerfile.cloudrun` を使って本体バックエンドのコンテナをビルドし、Cloud Run へデプロイします。
`deploy:hosting` は Cloud Run を先にデプロイしてから Firebase Hosting をデプロイします。
`deploy:hosting:only` は Cloud Run が既に存在する環境で Hosting だけを再デプロイします。

## 事前準備

Cloud Run が使う値は Secret Manager または Cloud Run の環境変数で設定します。最低限、次が必要です。

```txt
DATABASE_URL
REDIS_SERVER_HOST
REDIS_SERVER_PORT
REDIS_SERVER_PASSWORD  # 必要な Redis の場合のみ
```

Cloud SQL の Unix socket を使う場合は、`DATABASE_URL` を Cloud SQL 接続方式に合わせて作り、Cloud Run サービスに Cloud SQL instance を接続してください。

`cloudbuild.yaml` は既存の secret を消さないように `--update-env-vars` を使います。デフォルトの公開 URL は `https://sivflow-cloud.web.app` です。別ドメインで使う場合は `_PUBLIC_URL` を上書きしてください。

## Cloud Run へデプロイ

```bash
npm run deploy:cloudrun
```

リージョン、サービス名、公開 URL を変える場合は、npm の `--` 以降に Cloud Build の substitutions を渡します。

```bash
npm run deploy:cloudrun -- \
  --substitutions _REGION=asia-northeast1,_SERVICE=sivflow-api,_PUBLIC_URL=https://YOUR_HOSTING_DOMAIN
```

Cloud SQL instance を使う場合は、初回だけ Cloud Run サービスに接続を設定してください。

```bash
gcloud run services update sivflow-api \
  --region asia-northeast1 \
  --add-cloudsql-instances PROJECT_ID:asia-northeast1:INSTANCE_NAME
```

## Hosting へ反映

`firebase.json` では `/api/**`, `/graphql`, `/oauth/**`, `/socket.io/**` を Cloud Run の `sivflow-api` へ rewrite します。Cloud Run サービスが存在しない状態で Hosting だけを deploy すると Firebase Hosting の検証で失敗するため、通常は Cloud Run の作成を含む `deploy:hosting` を使います。

```bash
npm run deploy:hosting
```

Cloud Run が既に存在していて、静的フロントだけを再反映したい場合のみ次を使います。

```bash
npm run deploy:hosting:only
```

確認:

```bash
curl https://YOUR_HOSTING_DOMAIN/graphql
```

`GET /graphql` は GraphQL の仕様上 400 系になることがありますが、`not_found` ではなく GraphQL サーバー由来の応答になっていれば Cloud Run は本体バックエンドへ向いています。
