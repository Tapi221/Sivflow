# ナビゲーションモードのリファクタリング実装計画

## 概要

`RootFolderPanelList`（ナビゲーションモードで使用されるパネルリスト）を拡張し、フォルダだけでなくカードセット、カード、ドキュメントも表示・選択できるようにリファクタリングします。

## 実施事項

### 1. FolderTreeWithCards.tsx の修正

- `ExplorerItem` を型定義に追加します。
- `navigationEntries` を `useMemo` で定義し、現在の `navigationParentFolderId` に属する以下の項目を統合します：
  - 子フォルダ (`navigationFolderPanels`)
  - カードセット (`navigationCardSets`)
  - フォルダ内のアイテム（カード、ドキュメント） (`navigationItems`)
- `RootFolderPanelList` に渡すプロパティを更新し、`entries`、`selectedItem`、`selectedCardSetId`、`onItemSelect`、`setRowRef` を追加します。
- コンテンツの有無判定 (`hasRootContent`) や空メッセージ (`navigationEmptyMessage`) を `navigationEntries` に基づくように変更します。

### 2. RootFolderPanelList.tsx の修正

- `NavigationListEntry` 型を定義し、フォルダ、カードセット、カード、ドキュメントを区別できるようにします。
- `RootFolderPanelListProps` を拡張し、新しいプロパティを受け取るようにします。
- `rootFolderPanels.map` を `entries.map` に変更し、各項目を `RootFolderPanelRow` でレンダリングします。

### 3. RootFolderPanelRow.tsx の修正

- アイテムの種類（kind）に応じてアイコン（フォルダ、レイヤー、ファイルテキスト）を切り替えます。
- 選択状態 (`isSelected`) の判定ロジックを、フォルダIDだけでなくカードセットIDや `selectedItem` を考慮するように拡張します。
- クリック時の挙動 (`handleSelect`) を、フォルダの場合は下位層への遷移、それ以外の場合はアイテムの選択に分岐させます。
- コンテキストメニューと名前変更（編集）機能は、現時点ではフォルダのみに制限します。

## 影響範囲

- サイドバーのナビゲーションモード表示
- フォルダ階層の移動とアイテム選択の連動

## 確認事項

- [ ] ナビゲーションモードで、フォルダ、カードセット、カード、ドキュメントが正しく一覧表示されること
- [ ] 各アイテムをクリックした際に、期待通り遷移または選択が行われること
- [ ] 選択状態のハイライトが正しく表示されること
- [ ] フォルダのみ右クリックメニューが表示されること
