# IDEエラーおよびLint警告の解消計画

ユーザーから報告された複数のIDEエラーおよびLint警告を解消します。

## 修正対象と方針

### 1. [BlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/BlockEditor.tsx)
- **エラー**: `LinkIcon` が見つかりません。
- **原因**: リファクタリング時に誤ってimportを削除してしまったため。
- **対処**: `lucide-react` から `LinkIcon` を再インポートします。

### 2. [index.html](file:///c:/FlashcardMaster/index.html)
- **エラー**: `viewport` に `maximum-scale`, `user-scalable` が含まれている。
- **対処**: 該当属性を削除し、標準的な `viewport` 設定に戻します。
    - 変更前: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
    - 変更後: `width=device-width, initial-scale=1.0, viewport-fit=cover`
    - ※入力時のズーム防止は `src/index.css` の `min-font-size: 16px` で担保します。

### 3. [MediaUploader.tsx](file:///c:/FlashcardMaster/src/Components/card/MediaUploader.tsx)
- **エラー**: `IDs of active elements must be unique`
- **原因**: 複数の `MediaUploader` が存在する場合、`Draggable` の `draggableId="img-${index}"` が重複するため。
- **対処**: `useId()` で生成したユニークIDをプレフィックスとして付与します（例: `img-${uniqueId}-${index}`）。

### 4. インラインスタイルの修正 ( 各コンポーネント )
- **警告**: `CSS inline styles should not be used`
- **対処**:
    - **[Layout.tsx](file:///c:/FlashcardMaster/src/Layout.tsx)**: `style={{ width: 'max-content' }}` を Tailwind クラス `w-max` に置き換えます。動的な色指定などは維持します。
    - **[FolderMemo.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderMemo.tsx)**: 静的なスタイルがあればクラス化します。
    - **[CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)**: 静的なスタイルがあればクラス化します。
    - どうしてもインラインスタイルが必要な箇所（動的な値など）については、警告を許容するかコメントで抑制します。

## 検証計画
1. **ビルド**: `npm run build` を実行し、TypeScriptエラー（特に `LinkIcon`）が解消されたことを確認します。
2. **動作確認**:
    - アプリを起動し、リンクブロックが正しく追加できるか確認。
    - メディアブロック（画像）を複数追加し、ドラッグ＆ドロップ動作やコンソールエラー（ID重複）がないか確認。
