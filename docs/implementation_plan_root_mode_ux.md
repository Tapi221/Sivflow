# エクスプローラーのルート一覧モードにおける操作性向上修正

## 目的
セクションリストモード（ルート一覧モード）において、エクスプローラー上部の `+` ボタンをクリックした際、メニューを介さずに直接ルートフォルダ作成を開始できるように UI を改善しました。

## 修正内容

### 1. `src/components/folder/layout/TreeViewLayout.tsx`
- `TreeViewSidebar` コンポーネントに `preferDirectRootFolderCreate` プロパティを追加し、現在の `isSectionListMode` 状態を渡すように変更しました。

### 2. `src/components/folder/components/TreeViewSidebar.tsx`
- `TreeViewSidebarProps` インターフェースを更新し、`preferDirectRootFolderCreate` を受け取れるようにしました。
- 受け取ったプロパティを内部の `ExplorerTabs` コンポーネントへ引き継ぐように修正しました。

### 3. `src/components/explorer/ExplorerTabs.tsx`
- `ExplorerTabsProps` インターフェースを更新し、`preferDirectRootFolderCreate` を追加しました。
- **分岐ロジックの追加**:
  - `showExplorerActions` が有効、かつ `preferDirectRootFolderCreate` が真、かつ「カードセット作成」や「ドキュメント追加」が許可されていない（ルートフォルダ作成専用のコンテキストである）場合に、`DropdownMenu` ではなく直接 `onCreateRootFolder` を呼び出すボタンを表示するように変更しました。
  - それ以外の場合は、従来通り `ExplorerMenuPanel` を含むドロップダウンメニューを表示します。

## 完了確認
- `npx tsc --noEmit` により、型定義の不整合やエラーがないことを確認しました（Exit code: 0）。
- UI の階層構造に沿ったプロパティのバケツリレーが正しく実装されていることを確認しました。
