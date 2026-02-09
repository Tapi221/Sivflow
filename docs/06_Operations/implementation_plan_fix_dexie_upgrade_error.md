# データベースアップグレードエラー（主キー変更不備）の修正

Dexie.js において、既存テーブル（`tags`）の主キーを変更しようとした際に発生する `UpgradeError: Not yet support for changing primary key` を解決します。

## 問題の概要
Version 16 の実装において、`tags` テーブルの主キーを `[rootFolderId+name]` から `[userId+name]` に変更しましたが、Dexie は既存テーブルの主キー変更をサポートしていません。これにより、アプリケーションの初期化に失敗し、画面が真っ白になる等の重大な不具合が発生しています。

## 修正方針
1.  **回避策**: `tags` テーブルのスキーマを Version 15 と同じ状態に戻し、新スキーマを持つ新しいテーブル `tags_v2` を導入します。
2.  **データ移行**: Version 16 の `upgrade` 処理の中で、旧 `tags` テーブルから新 `tags_v2` テーブルへデータを移行（グローバル化に伴う統合）します。
3.  **プロパティ追加**: `LocalDB` クラスに `tags_v2` プロパティを追加します。
4.  **フック修正**: `useTags.ts` 等の全ての参照箇所を `db.tags` から `db.tags_v2` に変更します。

## 変更内容

### [localDB.ts](file:///c:/FlashcardMaster/src/services/localDB.ts) [MODIFY]
- Version 16 の `stores` 定義において、`tags` を元の `[rootFolderId+name], rootFolderId, userId, updatedAt` に戻します。
- 同じ Version 16 に `tags_v2: '[userId+name], userId, updatedAt'` を追加します。
- `upgrade` ロジックで、`tx.table('tags')` から読み取ったデータを `tx.table('tags_v2')` に `bulkAdd` します。
- クラスプロパティに `tags_v2!: Dexie.Table<...>` を追加します。

### [useTags.ts](file:///c:/FlashcardMaster/src/hooks/useTags.ts) [MODIFY]
- 全ての `db.tags` を `db.tags_v2` に置換します。
- 主キーによるアクセス（`db.tags.get([uid, name])` 等）が `tags_v2` の定義と一致することを確認します。

## 検証プラン
- **動作確認**:
    - アプリ起動時にエラーが発生せず、正常にダッシュボードやフォルダ画面が表示されること。
    - 既存のタグが正常に「グローバルタグ」として `tags_v2` に移行されていること。
    - 新しいタグの作成、色変更、削除が正常に行えること。
