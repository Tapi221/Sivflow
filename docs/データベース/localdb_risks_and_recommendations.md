# Dexie/IndexedDB 集約に関するリスク評価と改善提案

作成日: 2026-02-01
作成者: 自動調査

## 要約
- `src/services/localDB.ts` の最終スキーマ（version 14）で定義されているテーブルは以下の18個です: `folders`, `cards`, `users`, `userSettings`, `userStats`, `syncMetadata`, `levelHistories`, `deviceMeta`, `syncErrors`, `syncHistory`, `syncSettings`, `syncQueue`, `conflicts`, `tags`, `studyLogs`, `metadata`, `images`, `cardRelations`, `projectMaps`。
  - ※現状で「20以上」という閾値は超えていません（18）。ただし18は十分に多く、複雑化の懸念は妥当です。

- `localStorage` はアプリ内で幅広く使用されています（56箇所の参照を検出）。用途は以下のカテゴリに分類されます。
  - UI/UX 設定・トグル（`theme`, `FEATURE_FLAGS` 等）
  - 一時的なユーザーフラグ / チュートリアル状態（`useMapTutorial` 等）
  - デバイスID / clientSeq（`deviceId`, `OperationQueueService` の `CLIENT_SEQ_KEY`）
  - スナップショット / 自動バックアップ（`SnapshotService`, `AutoBackupService`）
  - Operation Queue の永続化（`OperationQueueService` は内部で localStorage を使って `_operation_queue` を保存）
  - コンテキスト・同期フラグ（`ContextService` が `last_sync_*` / `error_flag_*` を保存）

- 問題点のサマリ（重要）:
  1. キューの二重実装による整合性リスク
     - `OperationQueueService` は localStorage の `_operation_queue` を使ってキューを保持している。
     - 一方で、同期システム側（`SyncService` / `QueueManager`）は `localDB.syncQueue`（IndexedDB 上の `syncQueue` テーブル）を使っている。
     - 同一ドメイン（オフラインキュー）を localStorage と IndexedDB で別々に扱うことで、同期欠落・重複・競合状態が発生しやすい。

  2. localStorage と IndexedDB の混在による復旧/マイグレーションの複雑化
     - `AppInitializer` が起動時に `SnapshotService.migrateFromLocalStorage()` を呼び、localStorage のスナップショットを移行する一方で、ランタイムで localStorage を読み書きするサービス（`ContextService` や `OperationQueueService` 等）が残っている。
     - これにより「初回移行は行うが以降も localStorage に書かれる」ような状態が残ると、移行が不完全でバグが発生する。

  3. テーブル数の多さとスキーマバージョンの増加によるマイグレーション負荷
     - 現行で18テーブルあり、将来的に機能が増えると20超えは容易。テーブルが多いと Dexie の `version(n).stores({...})` でのマイグレーションコードの複雑化、互換性チェック、アップグレード失敗時のフォールバックが難しくなる。


## 詳細な調査結果（該当ファイル・振る舞い）
- `src/services/localDB.ts`
  - Dexie を用いて詳細実装。復旧（`importFromDatabase`, `extractFromFirestoreSDK`, `repairDataIntegrity`）やフォレンジック関数が含まれる。
  - `version(14)` にて最終的に上記18テーブルが定義される。

- `src/services/operationQueue.ts`
  - `_operation_queue`（localStorage）に対して enqueue/get/save/process を行う。`clientSeq` も localStorage で管理。
  - `QueueIntegrationService` は `localDB` にまず即時反映してから `OperationQueueService.enqueue(...)` を呼ぶ実装（楽観更新 + localStorage キュー）のパターン。

- `src/services/queueIntegration.ts` / `src/services/logic/QueueManager.ts` / `src/services/syncService.ts`
  - `QueueManager` / `SyncService` 側は `localDB.syncQueue` を使用してキュー操作・再試行を行っている。

- `src/services/SnapshotService.ts` / `src/services/AppInitializer.ts`
  - 起動時に localStorage のスナップショットを `migrateFromLocalStorage()` で移行する処理がある（互換性確保のために残す）。

- `src/services/ContextService.ts`
  - `last_sync_${userId}`, `error_flag_${userId}` などを localStorage で管理し、`AppInitializer` の挙動や同期コンテキスト判定に影響を与える。

- その他 localStorage 使用箇所
  - `deviceId`, `theme`, `FEATURE_FLAGS`, `AutoBackupService` のバックアップ配列など、UI・デバイス・運用に関する用途多数。


## 即時リスク（優先度順）
1. キューの二重管理（localStorage と IndexedDB） — 高
   - 起票位置: `OperationQueueService` (localStorage) と `localDB.syncQueue` / `QueueManager` (IndexedDB)
   - 想定される不具合: キュー処理の二重実行、失われた操作、永続化不整合、ResyncRequired 時の不整合

2. 起動時の Snapshot マイグレーションとランタイム localStorage 書き込みの混在 — 中
   - 起票位置: `AppInitializer.migrateFromLocalStorage()` と各種サービスの localStorage 書き込み
   - 想定される不具合: 部分的移行、古いデータが残存、ユーザーに見えない差分

3. テーブル数増加によるマイグレーション破壊リスク — 中〜高（将来）
   - 起票位置: `localDB.ts` の version 管理／マイグレーションコード
   - 想定される不具合: バージョンアップでの破壊的変更、アップグレード失敗時のデータ損失


## 改善提案（短期 / 中期 / 長期）

### 短期（すぐ着手できる、安全重視）
- 明確なストレージポリシーを README/設計に追記
  - 例: 「永続的・整合性が必要なデータは `IndexedDB (Dexie)`、UIトグルや一時フラグは `localStorage`」
- キューの一本化：`OperationQueueService` を段階的に `localDB.syncQueue` に移行
  - 1) 起動時に `_operation_queue` を `localDB.syncQueue` に移行するマイグレーションを実装（`AppInitializer` で実行）
  - 2) `OperationQueueService` をラッパー化して内部実装を `localDB.syncQueue` に切り替え（互換APIを維持）
  - 3) 移行完了後、localStorage の `_operation_queue` 読み書きを削除
- `ContextService` の `last_sync_*` と `error_flag_*` を `localDB.metadata` か `syncMetadata` に移行（または参照優先度を IndexedDB にする）

### 中期（2〜4週間目安、テスト整備含む）
- テーブル集約検討：用途が近接するテーブルは合体して "type" フィールドで区別
  - 例: `syncErrors` + `syncHistory` + `syncQueue` + `conflicts` → `syncEvents`（type: error/history/queue/conflict）
  - 例: `metadata` + `deviceMeta` → `meta` テーブル
  - 注意点: 合体は読み書きパターンを観察してから行い、頻繁アクセスのホットパスは分離。
- マイグレーションユーティリティの追加
  - 各 `version(n)` のアップグレードで実行する移行関数（データ移行・検証・バックアップ）の標準化
  - 失敗時にリトライ/ロールバックできる仕組みとログを追加
- 自動化テスト
  - IndexedDB のシナリオテスト（Jest + fake-indexeddb など）を追加し、マイグレーション/復旧パスを検証

### 長期（数ヶ月・アーキテクチャ改良）
- スキーマ設計見直し（HPK/パーティショニングなど）
  - 大量データや将来の分割を見据え、テーブル分割ルールを定める
- 管理用ツールの整備
  - ブラウザ内での DB 健全性ダッシュボード、エクスポート/インポート、Forensic Audit を UI から実行可能に
- 移行ポリシー（破壊的変更の手順書）
  - ユーザーへの影響最小化手順（段階的移行、サーバー側で互換性レイヤー提供等）


## 具体的なマイグレーション例（OperationQueue を IndexedDB に移す手順）
1. `AppInitializer` に `OperationQueueMigration.migrate()` を追加。起動時に localStorage の `_operation_queue` を読み、`localDB.syncQueue` に `action='opqueue'` などの形式で挿入。移行完了フラグを `metadata` に保存。
2. `OperationQueueService` を抽象化して、まず `localDB.syncQueue` を読みに行き、fallbackで localStorage を読むロジックにする（段階的）。
3. 一定期間（例: 1リリース）経過後に localStorage 側の読み書きを完全停止し、localStorage の `_operation_queue` を削除するアップグレードを実施。
4. テスト: 移行前後で queue の一貫性を確認する E2E テストを作成。


## 推奨優先順位（アクションプラン）
1. （高）`OperationQueue` → `syncQueue` の一本化マイグレーション（ホットパス）
2. （中）`ContextService` の localStorage 依存を IndexedDB またはメモリに切替え
3. （中）`SnapshotService` の移行ロジックを安全にし、移行フラグ／二重書き込み防止を実装
4. （中〜低）テーブル集約検討と段階的リファクタ
5. （高）マイグレーション・復旧の自動テストを整備


## 参考箇所（主要ファイル）
- `src/services/localDB.ts` — Dexie スキーマ & CRUD & 復旧実装
- `src/services/syncService.ts` — 同期ロジック（IndexedDBベース）
- `src/services/operationQueue.ts` — localStorage ベースの操作キュー
- `src/services/queueIntegration.ts` — queue と localDB を繋ぐブリッジ
- `src/services/SnapshotService.ts` — localStorage からのスナップショット移行
- `src/services/AppInitializer.ts` — 起動時の移行/健全性処理
- `src/services/ContextService.ts` — localStorage ベースのコンテキスト判定


---

必要であれば、上記の改善案に基づいて実際にコード変更（移行スクリプト作成、`OperationQueueService` のラッパー実装、`AppInitializer` への移行フック追加、テスト追加）を行います。どのアクションを優先して実装しましょうか？
