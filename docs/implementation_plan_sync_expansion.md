# 実装プラン: クラウド同期対象エンティティの拡張

## 概要

Manifolia の同期システムを拡張し、フォルダとカードだけでなく、カードセット、ドキュメント、タグ、ユーザー設定、アセットのすべてをデバイス間で同期できるようにします。

## ターゲット・エンティティ

- `cardSet`: カードセットのメタデータ
- `document`: PDFドキュメントのメタデータ（`localFileId` は同期除外）
- `tag`: タグ情報 (`tags_v3` テーブル)
- `userSetting`: ユーザー設定
- `asset`: 画像等のアセット情報 (`images` テーブル)

## 変更内容

### 1. 型定義の拡張

- `ISyncService.ts`, `sync.ts`: `SyncEntity` に新タイプを追加
- `sync.ts`: 各エンティティのペイロード型を定義

### 2. ローカルDB (LocalDB.ts) の更新

- `syncableTables` に新テーブルを追加
- `entityNameMap` を更新し、各テーブルを同期エンティティにマッピング
- `enqueueSync` でのドキュメント除外ロジックを一般化（サニタイズ層へ移動）

### 3. クラウド連携 (CloudSyncAdapter.ts) の汎用化

- `COLLECTION_BY_TYPE` に新タイプを追加
- `pullDiff` を全エンティティタイプに対してループ実行するよう修正
- `sanitizeForCloud` / `sanitizeFromCloud` で `localFileId` や `blobUrl` を適切に処理

### 4. 同期サービス (SyncServiceV2.ts) のマージ改善

- `applyRemoteChanges` でローカル専用フィールド（`localFileId`, `blobUrl`等）がリモートデータで上書きされないようマージ処理を強化

### 5. 再構築オーケストレーター (IndexedDBRebuildOrchestrator.ts) の更新

- フルリビルド対象に新しいテーブルを追加

## 検証項目

- [ ] 異なるデバイス間でカードセットやタグが同期されること
- [ ] ドキュメントの同期後も、ローカルにファイルがある場合は `localFileId` が保持されること
- [ ] ユーザー設定（学習モード設定等）が同期されること

## 影響範囲

- `src/services/interfaces/ISyncService.ts`
- `src/types/domain/sync.ts`
- `src/services/localdb/LocalDB.ts`
- `src/services/logic/CloudSyncAdapter.ts`
- `src/services/SyncServiceV2.ts`
- `src/services/IndexedDBRebuildOrchestrator.ts`

## 確認事項
- [ ] フォルダ、カードセット、タグ、ドキュメントが正しくクラウドに保存されるか。
- [ ] 別の端末でログインした際に、これらのデータがすべて復元されるか。
- [ ] PDFドキュメントの「ローカルのみ」のメタデータ（ファイルパス等）が同期によって消去されないか。
- [ ] アセット（画像）のローカルステータスが同期後も整合性を保っているか。
