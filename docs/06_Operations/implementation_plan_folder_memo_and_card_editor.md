# フォルダメモの複数サポートとカード編集画面の機能強化

ユーザーからの追加要望に基づき、以下の2点を実装します。
1. **フォルダメモの複数追加対応**: 単一のメモ欄ではなく、複数のメモを追加・管理できる形式に変更します。
2. **カード編集画面のボタン追加**: `Index Q〇` の左側に、カードの並び替え（順序変更）ボタンと削除ボタンを追加します。

## 変更内容

### 1. フォルダメモの複数サポート (Multiple Folder Memos)

#### データ構造の変更 (`src/types/index.ts`)
`Folder` 型に `memos` フィールドを追加します。
既存の `memoText`, `memoImages` は後方互換性のために残しつつ、新規データは `memos` に保存するように移行します。

```typescript
export interface FolderMemoItem {
  id: string;
  content: string; // テキスト
  images: UploadedImage[]; // 添付画像
  createdAt: number;
  updatedAt: number;
}

export type Folder = BaseEntity & {
  // ... existing ...
  memos?: FolderMemoItem[];
}
```

#### コンポーネント修正 (`src/Components/folder/FolderMemo.tsx`)
- **状態管理**: `memoText` 単体ではなく、`memos: FolderMemoItem[]` を管理します。
- **初期化ロジック**:
    - `folder.memos` が存在すればそれを使用。
    - なければ、既存の `memoText` / `memoImages` を使用して、最初のメモアイテムを生成（マイグレーション）。
- **UI変更**:
    - メモのリストを表示。
    - 各メモに対して「編集」「削除」が可能。
    - 「メモを追加」ボタンで新規メモ作成。
    - 各メモはアコーディオンまたはカード形式で表示し、個別に保存または一括保存（現状の自動保存ロジックを踏襲）。

### 2. カード編集画面のボタン追加 (Card Editor Enhancements)

#### コンポーネント修正 (`src/Pages/CardEdit.jsx`)
`CardEditor` に渡すためのアクションハンドラを実装します。
- **削除機能 (`handleDelete`)**: 現在のカードを削除し、フォルダ画面へ戻る。
- **並び替え機能 (`handleMoveUp`, `handleMoveDown`)**:
    - 現在のフォルダ内のカードリスト (`sortedCards`) を参照。
    - 「上へ移動`: 前のカードと `orderIndex` を交換。
    - 「下へ移動`: 次のカードと `orderIndex` を交換。

#### コンポーネント修正 (`src/Components/card/CardEditor.tsx`)
- **Props追加**: `onDelete`, `onMoveUp`, `onMoveDown`, `canMoveUp`, `canMoveDown` を受け取れるようにします。
- **UI変更**:
    - ヘッダー部分 (`Index Q〇` の左側) に操作ボタンエリアを追加。
    - `Trash2` (削除), `ArrowUp`, `ArrowDown` (並び替え) アイコンボタンを配置。

## 検証計画

### 手動検証
1. **フォルダメモ**
    - 既存のメモがあるフォルダを開き、データが消えていないこと（マイグレーション）を確認。
    - 「メモを追加」ボタンで新規メモが作れること。
    - 複数のメモを作成し、それぞれのテキスト・画像が正しく保存されること。
    - リロードしてもデータが維持されていること。

2. **カード編集画面**
    - カード編集画面を開く。
    - `Index Q〇` の左側に削除・並び替えボタンが表示されていること。
    - **並び替え**: 上下ボタンでカードの順序が入れ替わること（一覧画面に戻って確認、またはIndex番号が変わることで確認）。
    - **削除**: 削除ボタン押下で確認ダイアログが表示され、削除後にフォルダ画面へ戻ること。

## 実行手順
1. `src/types/index.ts` に型定義を追加。
2. `src/Pages/CardEdit.jsx` に削除・並び替えロジックを実装。
3. `src/Components/card/CardEditor.tsx` にボタンUIを追加。
4. `src/Components/folder/FolderMemo.tsx` をリスト形式にリファクタリング。
