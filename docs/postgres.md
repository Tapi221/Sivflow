# Sivflow Postgres setup

Sivflow の永続データは Postgres を正とします。

## ローカルでPostgresを起動

```bash
docker compose -f docker-compose.postgres.yml up -d
```

接続確認:

```bash
docker compose -f docker-compose.postgres.yml exec postgres psql -U sivflow -d sivflow -c "select version();"
```

初回起動時に `functions/db/migrations/001_init.sql` が実行されます。
同じDocker volumeを使い続ける場合、migration SQLを編集しても自動では再実行されません。
作り直す場合:

```bash
docker compose -f docker-compose.postgres.yml down -v
docker compose -f docker-compose.postgres.yml up -d
```

## 環境変数

ローカルのNode.jsプロセスから接続する場合は、`DATABASE_URL` をlocalhost向けに設定します。
Dockerコンテナ内のNode.jsから接続する場合は、hostを `postgres` にします。

例は `functions/.env.example` に置いています。

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
