# 追加ビューパターン実装計画

## 目的
`FolderView` のカードリストに3つの新しいビューパターンを追加し、視覚的なバリエーションを提供する。

## 提案するビュー
1.  **コンパクト表示 (`compact`)**:
    - リスト表示の高密度版。
    - パディングを削減し、詳細を省略して一行で表示。
    - 一覧性を重視。
2.  **ギャラリー表示 (`gallery`)**:
    - Masonry（組積造）スタイルのレイアウト。
    - カードの内容量に応じて高さを可変にする。
    - CSSの `columns` プロパティを使用し、スペースを有効活用する。
3.  **タイムライン表示 (`timeline`)**:
    - 垂直方向の時間軸（または学習パス）に沿ってカードを配置。
    - カード間を線でつなぎ、ステップごとの進捗や流れを表現。

## ユーザーレビュー事項
- **ギャラリー表示でのドラッグ&ドロップ**: Masonryレイアウト（CSS Columns）では、要素の並び順が「上から下、左から右」となるため、直感的なドラッグ順序と異なる場合がありますが、機能自体は維持します。
- **タイムライン表示の並び順**: タイムラインは本来時系列ですが、今回は「リストの並び順」をそのまま「パス」として可視化する形式を採用します。

## 変更内容

### [Pages] [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)
- [MODIFY] ツールバーに新しいビューモード切替用のアイコン/ボタンを追加。
- [MODIFY] `AlignJustify` (Compact), `LayoutDashboard` (Gallery), `GitGraph` (Timeline/Path) などのアイコンを使用。

### [Components] [CardList.tsx](file:///c:/FlashcardMaster/src/Components/card/CardList.tsx)
- [MODIFY] `CardList` コンポーネントで新しい `viewMode` (`compact`, `gallery`, `timeline`) を受け取れるように修正。
- [MODIFY] `CardItem` のスタイル分岐を追加。
    - **Compact**: 高さ固定 (`h-12`程度)、右側の要素を最小化。
    - **Gallery**: `h-auto`、`break-inside-avoid` を適用。親コンテナを `columns-xs` 等でMasonry化。
    - **Timeline**: 左側にタイムライン用のボーダーとドットを表示する装飾を追加。

## 検証計画
### 手動検証
1.  フォルダを開く。
2.  「コンパクト表示」に切り替え -> 高密度なリスト形式になるか確認。
3.  「ギャラリー表示」に切り替え -> Masonryレイアウト（高さ可変）になるか確認。
4.  「タイムライン表示」に切り替え -> 垂直タイムライン風の装飾が表示されるか確認。
5.  各ビューでドラッグ&ドロップが破綻しないか確認。
