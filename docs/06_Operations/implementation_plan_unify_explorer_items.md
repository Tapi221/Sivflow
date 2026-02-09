# ExplorerItem 統一モデルの導入

Explorer および FolderTree において、カードと PDF ドキュメントを「ExplorerItem」という統一された Union 型として扱うようにリファクタリングします。これにより、型安全性を高め、将来的な拡張（Markdown 等）を容易にします。

## ユーザーレビューが必要な項目

> [!IMPORTANT]
> - `selectedCardId` と `selectedDocumentId` を `selectedItem: SelectedExplorerItem` という一つの状態に統合します。
> - `folder` は `ExplorerItem` に含めず、現状のフォルダ選択ロジック（`selectedFolderId`）を維持します（主に右ペインの表示制御をカード/ドキュメントで統一するため）。

## 提案される変更

### 1. 型定義の整備
#### [MODIFY] [index.ts](file:///c:/FlashcardMaster/src/types/index.ts)
- `ExplorerItem` 型を定義: `{ type: 'card', data: Card } | { type: 'document', data: DocumentItem }`
- `SelectedExplorerItem` 型を定義: `{ type: 'card', id: string } | { type: 'document', id: string } | null`

### 2. コンポーネントのリファクタリング
#### [MODIFY] [FolderTreeWithCards.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTreeWithCards.tsx)
- `FolderTreeWithCardsProps` を `selectedItem: SelectedExplorerItem` と `onItemSelect: (item: SelectedExplorerItem) => void` を使うように変更。
- `getFolderItems` を `ExplorerItem[]` を返すように修正し、`orderIndex` でソート。
- `renderCard` と `renderDocument` を統一感のあるスタイルに調整し、共通の `type` 分岐で描画。
- 曖昧な型判定（`any` や `in` 演算子）を排除。

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- `selectedCardId` と `selectedDocumentId` を廃止し、`selectedItem` 状態を導入。
- `handleSelectCardInWork` と `handleSelectDocumentInWork` を `handleSelectItemInWork` に統合。

#### [MODIFY] [TreeViewLayout.tsx](file:///c:/FlashcardMaster/src/Components/folder/TreeViewLayout.tsx)
- `TreeViewLayoutProps` を更新し、新しく定義した選択状態を `FolderTreeWithCards` に伝搬。

### 3. 周辺コンポーネントの対応
#### [MODIFY] [RecentPanel.tsx](file:///c:/FlashcardMaster/src/Components/explorer/RecentPanel.tsx)
- 可能な範囲で `ExplorerItem` モデルに合わせたデータ処理に修正。

## 検証プラン

### 自動テスト
- `npx tsc --noEmit` を実行し、型エラーが発生しないことを確認。

### 手動確認
- [ ] Explorer 内でカードと PDF が混在して表示され、`orderIndex` 順に並んでいること。
- [ ] タイ（同順位）の場合に `updatedAt` 等で安定してソートされること。
- [ ] カードをクリックすると右ペインにエディタが表示されること。
- [ ] PDF をクリックすると別タブで開き、右ペインのエディタが（開いていた場合は）閉じられること。
- [ ] 選択ハイライトがカードと PDF の両方で一貫して機能すること。
