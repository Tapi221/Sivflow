# フォルダー選択チェックボックスのサイズ調整：完了報告

チェックボックスが巨大化していた問題を修正し、適正なサイズで表示されるように調整しました。

## 修正内容

### 1. 共通コンポーネントの修正
- **[checkbox.tsx](file:///c:/FlashcardMaster/src/Components/ui/checkbox.tsx)**: `min-h-0 min-w-0` を追加し、グローバルな最小サイズ制限を解除しました。

### 2. 個別コンポーネントの微調整
- **[FolderColumn.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderColumn.tsx)**: `scale-90` を削除し、`h-3.5 w-3.5` (14px) に設定しました。
- **[FolderTree.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTree.tsx)**: `scale-75` を削除し、`h-3.5 w-3.5` (14px) に設定しました。

## 動作確認のお願い
フォルダー一覧の選択モードや、設定画面のタグフィルター等でチェックボックスのサイズが適切になっているかご確認ください。
