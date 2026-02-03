# LocalDB アーキテクチャ改善計画 (Phase 1: Emergency Fix)

**作成日**: 2026-02-01
**更新日**: 2026-02-01 (Rev.6 Audit Compliant & No-Data-Loss)
**対象**: OperationQueueService, LocalDB

---

## 1. 目的 (Goal)

監査レポートで指摘された「オフラインキューの localStorage 依存による論理破損リスク（Queue Explosion）」を解消するため、`OperationQueueService` を改修し、操作キューとシーケンス番号管理を IndexedDB (`Dexie`) へ完全移行します。
**特に「データ消失」と「論理破損」を絶対に防ぐため、厳格な安全性基準（Safe Migration Policy）を適用します。**

---

## 2. 安全性基準 (Safety Standards)

### 2.1 冪等性の担保 (Strict Idempotency)

- **Content Hashing Key** を導入します。
- `migrationKey = hash(opType + entityId + clientSeq + operationUUID)`
  - *Note*: `operationUUID` は操作発生時に生成された不変ID、または UUIDv7 相当の時系列ユニークIDを使用。不安定な `timestamp` は使用しません。
- Dexie スキーマに `migrationKey` の **UNIQUE INDEX** を設定し、DBレベルで物理的に重複を阻止します。

### 2.2 アトミックなシーケンス管理 (Atomic Sequence)

- `clientSeq` の管理場所を **`syncMetadata` テーブルに一本化**します（曖昧さ排除）。
- キュー追加とシーケンス更新は **単一の Transaction** 内でのみ許可します。

### 2.3 Violation Rule (Sync Isolation)

- **同期処理中の書き込み禁止**: `SyncService` がキューを処理している間は、新たな `enqueue` 操作を禁止するか、明示的に「次回同期用キュー」へ分離して退避させることを必須ルールとします（Race Condition 防止）。

---

## 3. マイグレーション手順 (Migration Protocol)

### 3.1 2-Phase Commit & Verification

1. **Copy**: localStorage から IndexedDB へデータをコピー（**localStorage は温存**）。
2. **Strict Verification**:
   - **基準1（完全一致）**: `localStorage.queue.length === db.migrated.length`
   - **基準2（欠番検知）**: `clientSeq` に欠番がある場合、Migration 自体は成功と見なすが、`syncMetadata` に `needsSeqRepair: true` フラグを立てる（Phase 2 で修復）。
   - **基準3（Seq整合性）**: `localStorage.maxSeq === db.currentSeq`
3. **Commit**: 検証OKの場合のみ、localStorage をクリア。

### 3.2 復旧失敗時の UX (Safe Mode)

検証NG（復旧失敗）の場合、**「セーフモード（Read-Only）」** で起動します。

- **状態**: データの閲覧は可能だが、作成・編集などの変更操作は一切ブロック。
- **UI表示**:
  - ヘッダー: 「⚠️ データ保護モード」
  - メッセージ: 「データの整合性を確認できないため、保護のために変更操作を停止しています。データは無事です。」
- **解除条件**: セーフモードは、**ユーザーによる明示的な復旧操作（サーバー復元 / 再マイグレーション / 全削除して初期化）以外では決して解除してはならない。**自然復旧はあり得ない。

---

## 4. 変更内容 (Detailed Changes)

### 4.1 `src/services/localDB.ts`

- `syncQueue` テーブル: `migrationKey` (Unique Index) を追加。
- `syncMetadata` テーブル: `clientSeq` (number), `needsSeqRepair` (boolean) を追加。

### 4.2 `src/services/operationQueue.ts`

- **Mandatory Transaction**: 全ての `enqueue` を `db.transaction` でラップ。失敗時は関数全体が throw し、呼び出し元の UI 処理も失敗させる。
- **Migration Logic**: 上記 3.1 のプロトコルを実装。

### 4.3 `src/services/SyncService.ts`

- **Async Isolation**: 非同期化に伴う競合（Race Condition）を防ぐため、Queue読み出し中の新規書き込みブロック等を意識した実装を行う。

---

## 5. 制限事項 (Limitations)

- **容量保証なし**: IndexedDB は localStorage より大容量ですが、端末やブラウザの実装に強く依存するため、「〇〇件まで保証」という数値定義は行いません。実用上は数万件程度が多くの環境で動作すると推定されます。
- **Conflict 自動解決**: 今回はスコープ外。

---

## 6. 検証計画 (Verification Plan)

### 6.1 自動テスト (Chaos Testing)

- **Migration**:
  - localStorage ID破損データに対する Hash Key 重複排除の動作確認。
  - 欠番ありデータ移行後の `needsSeqRepair` フラグ確認。
- **Transaction**:
  - `enqueue` 途中で例外を投げ、`clientSeq` だけが進んでいないことを確認。

### 6.2 手動検証

- **Safe Mode UX**: Migration 失敗状態を意図的に作り、UI が Read-Only になり、かつ適切な誘導メッセージが出ることを確認。
