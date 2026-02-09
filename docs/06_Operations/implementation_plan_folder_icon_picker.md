# フォルダアイコン変更機能の実装

フォルダ管理画面で各フォルダに任意のアイコンを設定できる機能を実装します。

## 変更の概要

ユーザーがフォルダ作成・編集時にアイコンを選択できるようにし、選択したアイコンをフォルダツリーやサブフォルダチップに表示します。

## 提案される変更

### データベーススキーマ

#### [MODIFY] [localDB.ts](file:///c:/FlashcardMaster/src/services/localDB.ts)
- フォルダテーブルに `folderIcon` フィールドを追加（既存のスキーマ定義は変更不要、Dexieは動的フィールドをサポート）

### UI Components

#### [MODIFY] [FolderDialog.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderDialog.tsx)
- アイコン選択UIを追加
- よく使われるアイコンのグリッド表示（Folder, Book, Star, Heart, Briefcase, Code, Music, Image, Video, File など）
- 選択されたアイコンの状態管理
- 保存時に `folderIcon` を含める

#### [MODIFY] [FolderTree.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTree.tsx)
- フォルダアイコン表示部分を `folder.folderIcon` に基づいて動的に変更
- デフォルトは `Folder` アイコン

#### [MODIFY] [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)
- サブフォルダチップのアイコンを動的に表示

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- `handleSaveFolder` で `folderIcon` を保存データに含める

## 検証計画

### 手動確認
1. **新規フォルダ作成:**
   - フォルダ作成ダイアログを開く
   - アイコン選択UIが表示されることを確認
   - 任意のアイコンを選択して保存
   - フォルダ一覧で選択したアイコンが表示されることを確認

2. **フォルダ編集:**
   - 既存フォルダの編集ダイアログを開く
   - 現在のアイコンが選択状態で表示されることを確認
   - 別のアイコンに変更して保存
   - 変更が反映されることを確認

3. **サブフォルダ表示:**
   - サブフォルダを持つフォルダを開く
   - サブフォルダチップに正しいアイコンが表示されることを確認

### 自動テスト
- `npm run build` を実行し、ビルドエラーが発生しないことを確認
