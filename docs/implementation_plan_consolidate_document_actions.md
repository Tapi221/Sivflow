# 実装計画 - ドキュメント追加アクションの統合

PDFとPPTXの追加アクションを「文書追加」として一つに統合します。

## 変更内容

### 1. `src/components/folder/layout/TreeViewLayout.tsx`

- `onAddPdf` と `onAddPptx` プロップを `onAddDocument` に統合し、`handleAddDocumentFromHeader` を渡すように変更します。

### 2. `src/components/folder/components/TreeViewSidebar.tsx`

- `TreeViewSidebarProps` インターフェースの `onAddPdf`, `onAddPptx` を `onAddDocument` に変更します。
- コンポーネントの引数および `ExplorerTabs` へのプロップ渡しを更新します。

### 3. `src/components/explorer/ExplorerTabs.tsx`

- `ExplorerTabsProps` インターフェースの `onAddPdf`, `onAddPptx` を `onAddDocument` に変更します。
- `buildExplorerCreateMenuActions` の呼び出しおよび `useMemo` の依存配列を更新します。

### 4. `src/components/folder/components/menus/explorerMenuActionBuilders.tsx`

- `BuildExplorerCreateMenuActionsParams` インターフェースの `onAddPdf`, `onAddPptx` を `onAddDocument` に変更します。
- `buildExplorerCreateMenuActions` 関数内で、PDFとPPTXの個別アクションを一つの「文書追加」アクションに変更します。

## 影響範囲

- エクスプローラーの「＋」メニューの内容が変更されます（PDF追加/PPTX追加 -> 文書追加）。
- 内部的なコールバックの受け渡しが統合されます。
