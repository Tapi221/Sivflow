# タグ共通化とカラム表示での絞り込み実装計画

タグを全フォルダで共通利用できるようにし、カラム表示（エクスプローラー風）においてタグによるカードのフィルタリングを実現します。

## ユーザーレビューが必要な項目
- データベースのスキーマ変更（Version 15 → 16）を伴います。
- 既存の「フォルダに紐付いたタグ」は「ユーザーに紐付いた共通タグ」として統合されます（同じ名前のタグは色が統合される可能性があります）。

## 変更内容

### [1] Database (LocalDB)
- **[MODIFY] [localDB.ts](file:///c:/FlashcardMaster/src/services/localDB.ts)**
    - Version 16 を定義。
    - `tags` テーブルのインデックスを `[rootFolderId+name]` から `[userId+name]` に変更。
    - 既存データの移行ロジック（`rootFolderId` を持つタグを共通タグへ集約）を追加。

### [2] Hooks
- **[MODIFY] [useTags.ts](file:///c:/FlashcardMaster/src/hooks/useTags.ts)**
    - `rootFolderId` 引数を廃止またはオプショナルにし、全てのタグ操作（取得・追加・更新）を `userId` 単位で行うように修正。
    - タグの色管理を全フォルダ共通にする。

### [3] UI Components
- **[MODIFY] [ColumnNavigator.tsx](file:///c:/FlashcardMaster/src/Components/folder/ColumnNavigator.tsx)**
    - 絞り込みロジックを強化。タグ選択時に「そのタグを持つカードが含まれるフォルダのみを表示」するだけでなく、選択されたタグを `FolderColumn` に伝播させる。
    - カラム表示のカード一覧に対しても絞り込みを適用。

- **[MODIFY] [FolderColumn.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderColumn.tsx)**
    - `selectedTags` プロップスを追加（中継用）。
    - 描画される `childCards` を `selectedTags` でフィルタリングする。

- **[MODIFY] [TagManagerDialog.tsx](file:///c:/FlashcardMaster/src/Components/tag/TagManagerDialog.tsx)**
    - フォルダごとのグルーピング表示を廃止し、ユーザーの全タグをフラットに（または使用頻度順などに）表示する UI に変更。

## 検証計画

### 自動テスト
- なし（UI操作による検証が主）

### 手動検証
1. 異なるフォルダのカードに同じ名前のタグを付与する。
2. タグ管理画面でそのタグの色を変更し、全てのフォルダのカードに反映されることを確認。
3. カラム表示でタグを選択し、関係のないフォルダが隠れ、各カラムのカード一覧がそのタグを持つものだけに制限されることを確認。
