# Sivflow Postgres setup

Sivflow の永続データを Firestore から Postgres へ寄せるための準備メモです。

## 現状

Firebase Hosting は静的フロント配信として残します。
Cloud Functions は現在、Firestore / Firebase Auth / Storage を使っています。
Postgres 化するときも、Auth と Storage は残して、アプリ固有データだけを Postgres へ移すのが安全です。

現在 Firestore を使っている主な場所:

- `functions/src/firebaseAdmin.ts`
  - `getDb()` が Firestore インスタンスを返す
- `functions/src/gcal/oauthCallables.ts`
  - `users/{uid}/googleCalendarAccounts/{accountId}` にGoogle OAuthトークン情報を保存
- `functions/src/timetable/syllabusCrawler.ts`
  - `timetableSyllabusSources`
  - `timetableSyllabusCatalog`
  - `timetableSyllabusCrawlJobs`
  - `timetableSyllabusCrawlJobs/{jobId}/courses`

## ローカルでPostgresを起動

```bash
docker compose -f docker-compose.postgres.yml up -d
```

接続確認:

```bash
docker exec -it sivflow-postgres psql -U sivflow -d sivflow -c "select version();"
```

初回起動時に `functions/db/migrations/001_init.sql` が実行されます。
同じDocker volumeを使い続ける場合、migration SQLを編集しても自動では再実行されません。
作り直す場合:

```bash
docker compose -f docker-compose.postgres.yml down -v
docker compose -f docker-compose.postgres.yml up -d
```

## 環境変数

ローカルのNode.jsプロセスから接続する場合:

```env
DATABASE_URL=postgresql://sivflow:sivflow_pass@localhost:5432/sivflow
```

Dockerコンテナ内のNode.jsから接続する場合:

```env
DATABASE_URL=postgresql://sivflow:sivflow_pass@postgres:5432/sivflow
```

例は `functions/.env.example` に置いています。

## 移行方針

### Phase 1: DB基盤を入れる

- `docker-compose.postgres.yml` でローカルPostgresを起動できるようにする
- `functions/db/migrations/001_init.sql` で現在のFirestoreデータに対応するテーブルを作る
- `DATABASE_URL` を環境変数として管理する

### Phase 2: FunctionsからPostgresへ接続する

`functions/package.json` にPostgresクライアントを追加します。
候補:

```bash
cd functions
npm install pg
npm install -D @types/pg
```

その後、`functions/src/postgres.ts` のような共通接続モジュールを作ります。

### Phase 3: Firestore保存処理をPostgresへ置き換える

優先順:

1. `gcal/oauthCallables.ts`
   - `google_calendar_accounts` テーブルへ移行
2. `timetable/syllabusCrawler.ts`
   - `timetable_syllabus_sources`
   - `timetable_syllabus_catalog`
   - `timetable_syllabus_crawl_jobs`
   - `timetable_syllabus_crawl_job_courses`

Firebase Auth はユーザー認証として残します。
Storage もGoogleプロフィール画像キャッシュなどで使うため、すぐには消しません。

## 本番構成

推奨構成:

```txt
Firebase Hosting
  -> Cloud Run / Cloud Functions
  -> Cloud SQL for PostgreSQL
```

Firebase Hosting から直接Postgresへ接続することはできません。
必ず Functions / Cloud Run などのサーバーを間に置きます。

Cloud SQL を使う場合、Functions / Cloud Run 側には以下を設定します。

- `DATABASE_URL`
- Cloud SQL接続設定
- 必要ならVPC Connector
- Secret ManagerでDBパスワード管理

## 注意

このPRはPostgres化の土台です。
まだ既存のFirestore読み書きコードは置き換えていません。
次のPRで `pg` を追加し、Functionsの保存処理を段階的にPostgresへ移します。
