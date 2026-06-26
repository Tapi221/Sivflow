# Sivflow Postgres setup

Sivflow の永続データを Postgres へ寄せるための準備メモです。

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

## 移行方針

Firebase Hosting は静的フロント配信として残します。
Postgres 化では、認証やファイル保存はFirebase側に残し、アプリ固有データを段階的にPostgresへ移します。

優先順:

1. Google Calendar アカウント保存先を `google_calendar_accounts` へ移す
2. シラバスクローラーの保存先を `timetable_syllabus_*` 系テーブルへ移す

## 本番構成

```txt
Firebase Hosting
  -> Cloud Run
  -> Cloud SQL for PostgreSQL
```

Firebase Hosting から直接Postgresへ接続することはできません。
必ず Cloud Run などのサーバーを間に置きます。

Cloud Run の build / deploy / Hosting rewrite は `docs/cloudrun.md` を参照してください。
既存の Firebase Cloud Functions は、Google Calendar 連携と crawler API を Cloud Run に移すまで互換用として残します。
