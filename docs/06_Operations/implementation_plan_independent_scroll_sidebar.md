# 実装計画: サイドバーの固定表示（独立スクロール）対応

## ゴール
1. **独立スクロール**: サイドバーとメインコンテンツのスクロールエリアを分離する。
2. **サイドバーの完全固定**: メインコンテンツをスクロールしても、サイドバーが画面上で微動だにしないようにする（StickyではなくFixed/App-likeな挙動）。
3. **コンテナの高さ固定**: ウィンドウ全体のスクロールは無効化し、指定された領域内でのみスクロールさせる。

## Proposed Changes

### 1. [Layout Structure] TreeViewLayout.tsx
- **Main Container**:
  - `min-h-[calc(100vh-140px)]` を `h-[calc(100vh-140px)]`に戻す。
  - `overflow-hidden` を再適用。
  - `items-stretch` は維持。
- **Left Pane (Wrapper)**:
  - `sticky` クラスを削除。
  - `h-full` と `overflow-y-auto` を直接適用。
- **Right Pane**:
  - `flex-col` と `overflow-hidden` を再適用。

### 2. [Child Component] CardEditorPane.tsx
- コンテナに `h-full overflow-y-auto` を再適用し、内部スクロールを有効化。

## Verification Plan

### Manual Verification
1. **スクロール動作**:
   - 右側のカード編集エリアでスクロールしても、左側のサイドバーが全く動かないことを確認。
   - 左側のサイドバーでスクロールしても、右側のコンテンツが動かないことを確認。
   - ウィンドウ全体のスクロールバーが表示されないことを確認（画面サイズによるが、基本は内部スクロール）。
2. **リサイズ動作**:
   - リサイズハンドルが正常に機能し、高さ方向いっぱいまでドラッグ可能であることを確認。
