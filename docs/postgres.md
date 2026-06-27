# Sivflow Postgres setup

Sivflow の永続データは Postgres を正とします。

## ローカルでPostgres / Redisを用意

ローカル開発では、PostgreSQL 16 + pgvector と Redis をOS側で起動します。

必要な接続先:

```txt
PostgreSQL: localhost:5432 / database=sivflow / user=sivflow
Redis:      localhost:6379
```

接続確認:

```bash
npm run db:check
```

PostgreSQLの初期化SQLは `functions/db/migrations/*.sql` に置きます。
初回セットアップ後、次でSQLを適用します。

```bash
npm run db:migrate
```

psqlで直接入る場合:

```bash
npm run db:psql
```

## 環境変数

ローカルのNode.jsプロセスから接続する場合は、`DATABASE_URL` をlocalhost向けに設定します。
認証情報は各自のローカルPostgreSQL設定に合わせてください。

例は `functions/.env.example` と `packages/backend/server/.env.example` に置いています。

## 保存先

次の領域は Postgres に保存します。

- AFFiNE / Sivflow backend の Prisma モデル
- Google Calendar 連携アカウント: `google_calendar_accounts`
- シラバスクローラーのソース: `timetable_syllabus_sources`
- シラバスクローラーのカタログ: `timetable_syllabus_catalog`
- シラバスクローラーのジョブ: `timetable_syllabus_crawl_jobs`
- ジョブごとの保存コース: `timetable_syllabus_crawl_job_courses`

Google OAuth のプロフィール画像キャッシュや Firebase Auth のユーザー情報など、Firebase の認証・ストレージ機能そのものは引き続き Firebase 側を使います。アプリ固有データの正は Postgres です。

## 本番構成

```txt
Firebase Hosting
  -> Cloud Run
  -> Cloud SQL for PostgreSQL
```

Firebase Hosting から直接Postgresへ接続することはできません。
必ず Cloud Run などのサーバーを間に置きます。

Cloud Run の build / deploy / Hosting rewrite は `docs/cloudrun.md` を参照してください。
