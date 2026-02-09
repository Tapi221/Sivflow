# ExplorerにおけるPDFドキュメント表示の実装計画

## 概要
既存の Explorer / FolderTree に、LocalDB の `documents` テーブルに保存されている PDF ドキュメントをカードと並列に表示できるようにします。

## 要求事項
- フォルダ配下に「カード + PDF」を混在して表示。
- 表示順は `orderIndex` に基づく。
- PDFは閲覧専用（編集不可・クリックで別タブ表示）。
- 既存のカード機能を破壊しない。

## 変更内容

### 1. [NEW] Hook: `src/hooks/useDocuments.ts`
PDF ドキュメントを取得するためのフックを新規作成します。

- `getAllDocuments()`: 全ドキュメント取得
- `getDocumentsByFolder(folderId)`: 特定フォルダのドキュメント取得
- `isDeleted === true` のものは除外。

#### [NEW] [useDocuments.ts](file:///c:/FlashcardMaster/src/hooks/useDocuments.ts)

### 2. UI: `FolderTreeWithCards.tsx` などの拡張
フォルダ内のアイテム表示ロジックを修正し、カードとドキュメントをマージして表示します。

#### [MODIFY] [FolderTreeWithCards.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTreeWithCards.tsx)
- カードだけでなくドキュメントも取得するように拡張。
- `items = [...cards, ...documents].sort((a, b) => a.orderIndex - b.orderIndex)` のようなマージ処理。
- PDF用のレンダリング (アイコン: `FileText`, タイトル表示)。
- クリック時の分岐（PDFなら `window.open`）。

### 3. 型定義の整理
`Card | Document` の Union 型を活用し、コンポーネント内での判定を安全に行います。

## 検証プラン

### 自動テスト
- `npx tsc --noEmit` で型エラーがないことを確認。

### 手動検証
- 開発コンソールから `localDB.addItem('documents', { ... })` でテストデータを投入し、Explorer に表示されるか確認。
- PDF行をクリックした際、`downloadUrl` があれば別タブで開くことを確認。
- カードの編集機能が従来通り動作することを確認。
