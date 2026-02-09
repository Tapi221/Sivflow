# カラム表示（Column View）のレイアウト最適化

カラム表示において、余白が多すぎて見づらいという問題を解決するため、各要素のサイズと間隔を調整し、より情報を凝縮したレイアウトに変更します。

## Proposed Changes

### [Component] Folder Navigator

#### [MODIFY] [FolderColumn.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderColumn.tsx)
- カラムの幅を `w-[300px]` から `w-[240px]` に縮小。
- ガラスパネルのパディングを `p-6` から `p-4` に縮小。
- ヘッダー下のマージンを `mb-4` から `mb-2` に縮小。
- 各フォルダ項目の垂直パディングを `py-1` から `py-0.5` に微調整。
- アイコンとテキストの間隔を `gap-3` から `gap-2` に縮小。
- フォルダ名とカード数の情報をよりコンパクトに配置。

#### [MODIFY] [ColumnNavigator.tsx](file:///c:/FlashcardMaster/src/Components/folder/ColumnNavigator.tsx)
- カラム間のギャップを `gap-6` から `gap-3` に縮小。
- 上下の余白（`pt-2 px-2` など）を適宜調整。

## Verification Plan

### Automated Tests
- 現状、UIコンポーネントのレイアウトに関する自動テストは存在しないため、ビルドエラーが発生しないことを確認します。
```pwsh
npm run build
```

### Manual Verification
1.  ブラウザでフォルダ一覧画面を開く。
2.  表示モードを「カラム」に切り替える。
3.  以下の項目を確認する：
    -   カラム間の隙間が適切に詰まっているか。
    -   1つのカラム内のフォルダ項目がコンパクトに表示されているか。
    -   テキストの切り捨て（truncate）が不自然に起きていないか。
    -   横スクロールがスムーズに機能するか。
