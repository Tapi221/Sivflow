# LocalDB アーキテクチャ改善計画 (Phase 1: Emergency Fix)

**作成日**: 2026-02-01
**更新日**: 2026-02-01 (Rev.8 Final Polish)
**対象**: OperationQueueService, LocalDB

## 1. 目的 (Goal)
監査レポートで指摘された「オフラインキューの localStorage 依存による論理破損リスク（Queue Explosion）」を解消するため、`OperationQueueService` を改修し、操作キューとシーケンス番号管理を IndexedDB (`Dexie`) へ完全移行します。
**特に「データ消失」と「論理破損」を絶対に防ぐため、厳格な安全性基準（Safe Migration Policy）を適用します。**

## 2. 安全性基準 (Safety Standards)

### 2.1 冪等性の担保 (Strict Idempotency)
*   `clientSeq` は修復等で変わり得るため、冪等性キーの構成要素から除外します。
*   `migrationKey = hash(opType + entityId + operationUUID)`
    *   *Note*: `operationUUID` は操作発生時に生成された不変IDを使用。
*    Dexie スキーマに `migrationKey` の **UNIQUE INDEX** を設定し、物理的に重複を阻止します。

### 2.2 Violation Rule (Sync Isolation)
*   **同期処理中の書き込み完全禁止**:
    *   `SyncService` は `isSyncing` フラグを公開します。
    *   **定義**: `isSyncing` は「SyncService がキューをロックしている論理状態」を表し、UIのローディング表示状態とは独立して管理されます。
    *   `enqueue` メソッドはこのフラグをチェックし、true の場合は即座に **`SyncInProgressError` を throw** します。
    *   UI層はこのエラーをハンドリングするか、事前に操作ボタンを disable にして事故を防ぎます（Fail Fast）。

### 2.3 Backpressure (Queue Limit)
*   `syncMetadata` に `queueHardLimit` (Default: 10,000) を設定。
*   `enqueue` 時に現在の件数をチェックし、超過している場合は **`QueueLimitExceededError` を throw** して書き込みを拒否します。
*   **UX措置**: `QueueLimitExceededError` は「回復可能エラー (Recoverable Error)」として扱います。UIはユーザーに対し「強制同期（サーバー復元）」または「Safe Mode への移行」を提案するダイアログを表示します。

## 3. マイグレーション手順 (Migration Protocol)

### 3.1 2-Phase Commit & Verification
1.  **Copy**: localStorage から IndexedDB へデータをコピー（**localStorage は温存**）。
2.  **Strict Verification**:
    *   **基準1（完全一致）**: `localStorage.queue.length === db.migrated.length`
        *   *Note*: Phase 1 ではフィルタやバージョン違いを除外しないため完全一致を必須としますが、将来的に除外条件が増えた場合はこの基準は見直されます。
    *   **基準2（欠番検知）**: `clientSeq` に欠番がある場合、`syncMetadata` に `needsSeqRepair: true` フラグを立てる（Migration自体は成功扱い）。
    *   **基準3（Seq参考指標）**: `localStorage.maxSeq === db.currentSeq` は参考指標とし、不一致でも失敗とはしないが警告ログを残す（localStorage側の信頼性が低いため）。
3.  **Commit**: 検証OKの場合のみ、localStorage をクリア。

### 3.2 復旧失敗時の UX (Safe Mode Persistence)
検証NG（復旧失敗）の場合、**「セーフモード（Read-Only）」** で起動します。
*   **永続化**: `syncMetadata.safeMode = true` を DB に保存します。
*   **起動チェック**: アプリ起動時（`initialize`）に必ずこのフラグをチェックし、true ならばマイグレーション成功可否に関わらずセーフモードを維持します。
*   **解除条件**: ユーザーが設定画面から「サーバー復元」等の明示的な復旧操作を実行し、フラグがクリアされるまで、**ブラウザ再起動やリロードを行っても解除されません**。

## 4. 変更内容 (Detailed Changes)

### 4.1 `src/services/localDB.ts`
*   `syncQueue` テーブル: `migrationKey` (Unique Index) を追加。
*   `syncMetadata` テーブル: 
    *   `clientSeq` (number)
    *   `needsSeqRepair` (boolean)
    *   `safeMode` (boolean)
    *   `queueHardLimit` (number)

### 4.2 `src/services/operationQueue.ts`
*   **Mandatory Transaction**: 全ての `enqueue` を `db.transaction` でラップ。
*   **Validation**: `isSyncing` チェック、`queueHardLimit` チェックを追加。
*   **Migration**: Rev.8 のプロトコル（Hash仕様変更、Verify基準変更）を実装。

### 4.3 `src/services/SyncService.ts`
*   **State Exposure**: `isSyncing` 状態（論理ロック）を外部（QueueService）から参照可能にする。

## 5. 検証計画 (Verification Plan)

### 5.1 自動テスト (Chaos Testing)
*   **Migration**:
    *   localStorage ID破損データに対する Hash Key 重複排除の動作確認。
    *   `isSyncing` 中の `enqueue` がエラーになることの確認。
*   **Safe Mode**:
    *   `safeMode=true` の状態でリロードしても、モードが解除されないことを確認。

### 5.2 手動検証
*   **Safe Mode UX**: Migration 失敗状態を意図的に作り、UI が Read-Only になり、かつ「データ保護モード」が維持されることを確認。
