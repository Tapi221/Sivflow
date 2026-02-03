# ブラウザストレージ運用者向けガイド

**最終更新**: 2026-01-30

## 概要

本プロジェクトは、「ブラウザストレージ設計指針」に完全準拠した堅牢なストレージ管理システムを実装しています。
本ドキュメントでは、運用者・開発者が知っておくべきストレージシステムの挙動、トラブルシューティング、保守運用について説明します。

---

## 1. システム構成

### 1.1 コアコンポーネント

| コンポーネント | 役割 | ファイル |
| :--- | :--- | :--- |
| **StorageStateManager** | ストレージの状態（CLEAN/DIRTY/READ_ONLY）を管理。userId スコープ。 | `src/services/StorageStateManager.ts` |
| **SafeIndexedDBWriter** | IndexedDBへの書き込みを一元管理。QuotaExceededError を検知・制御。 | `src/services/SafeIndexedDBWriter.ts` |
| **IndexedDBMetadataService** | DBの健全性（メタデータ、整合性）をチェック。 | `src/services/IndexedDBMetadataService.ts` |
| **AppInitializer** | アプリ起動時の初期化・修復プロセスを統括。 | `src/services/AppInitializer.ts` |
| **SnapshotService** | バックアップ（スナップショット）を管理。Firestore 保存に対応。 | `src/services/SnapshotService.ts` |
| **HistoryCompressionService** | 学習履歴の自動圧縮（バックグラウンド実行）。 | `src/services/HistoryCompressionService.ts` |

### 1.2 ストレージステート

アプリは以下の3つの状態を持ちます。

- **DIRTY (初期状態)**:
  - 起動直後、または書き込み中の状態。
  - 正常終了時に CLEAN に遷移します。
  - 次回起動時に DIRTY のままであれば、前回「異常終了」したとみなされます。

- **CLEAN**:
  - データ整合性が保証されている状態。

- **READ_ONLY**:
  - 容量不足 (QuotaExceededError) が発生した状態。
  - 新規の書き込みは拒否され、クラウド同期のみが許可されます。

---

## 2. 運用フロー

### 2.1 起動時の自動修復 (Auto-Repair)

`AppInitializer.initialize()` 実行時に以下のステップで健全性を確認します。

1. **メタデータチェック**: `schemaVersion`, `lastFullSyncAt`, `expectedEntityCounts` の検証。
2. **不整合検知時**:
   - `IndexedDBRebuildOrchestrator` が起動。
   - **LocalDB を即時破棄**（部分修復はしない）。
   - クラウドから全データを再同期。
   - スナップショットを復元。
3. **正常時**:
   - 前回のスナップショットを Firestore にバックアップ。
   - 30日以上前の学習履歴を圧縮（バックグラウンド）。

### 2.2 容量不足時の挙動

`QuotaExceededError` が発生した場合：

1. `SafeIndexedDBWriter` が検知。
2. ステートを `READ_ONLY` に変更。
3. ユーザーには「保存容量が一杯です」等の通知を表示（UX成熟度 Tier 2）。
4. **以降の IndexedDB 書き込みは失敗**するが、アプリはクラッシュしない。
5. ユーザーに対して不要なデータの削除やクラウド同期を促す。

### 2.3 履歴データの圧縮

長期運用による肥大化を防ぐため、以下の戦略で自動圧縮されます。

- **対象**: 30日以上前の `studyLogs`
- **処理**: 日次集計データを作成し、元の raw event を削除
- **タイミング**: アプリ起動後のアイドル時（`requestIdleCallback`）

---

## 3. トラブルシューティング

### 3.1 データがおかしい・同期されない

最も手っ取り早い解決策は **IndexedDB の完全リセット** です。本システムは「消えても再構築できる」前提で作られています。

**手動リセット手順:**
1. ブラウザの DevTools を開く (F12)。
2. `Application` タブ -> `Storage` -> `IndexedDB`。
3. `flashcardMasterDB` を選択し、「Delete database」。
4. ページをリロード。
   - -> 自動的にクラウドからデータが再ダウンロードされます。

### 3.2 "QuotaExceededError" が頻発する

1. **不要なデータの確認**: 画像データなどが肥大化していないか確認。
2. **スナップショットのクリーンアップ**: 古いローカルスナップショットが残っていないか調査（現在はFirestore移行済みのため発生頻度は低い）。
3. **ブラウザの制限**: モバイルSafariなどは厳しい制限があるため、Webアプリとしての限界の可能性あり。

### 3.3 開発時の注意点

- **直接 `db.table.add()` しない**: 必ず `SafeIndexedDBWriter` を通してください。
- **スキーマ変更**: `db.version(x).stores(...)` を変更する場合、後方互換性を考慮する必要はありません。失敗したら再構築される設計です。

---

## 4. 関連ドキュメント

- [設計指針](../01_Database/ブラウザストレージ設計指針.md): 設計哲学
- [技術仕様書](../00_Overview/技術仕様書.md): 全体アーキテクチャ

