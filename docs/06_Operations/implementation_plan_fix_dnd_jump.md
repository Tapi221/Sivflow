# DNDドラッグ時のジャンプ挙動修正案

親コンテナのスケーリング（`transform: scale()`）環境下で、DNDドラッグ開始時にブロックが大きくズレる問題を修正します。

## 原因分析
- `hello-pangea/dnd` (旧 `react-beautiful-dnd`) は、ドラッグ中に要素を `position: fixed` に設定し、ビューポート基準の `top`/`left` を計算します。
- しかし、親要素に `transform` がある場合、その要素が `fixed` 要素の新しい基準点（Containing Block）となり、なおかつ `scale` の影響も受けます。
- 結果として、ライブラリが設定した座標が二重に計算されたり、基準点がズレたりして「ジャンプ」が発生します。

## 修正内容

### [BlockEditor](file:///c:/FlashcardMaster/src/Components/card/BlockEditor.tsx)

#### 1. コンテナ座標の計測
- `containerRef` を使用して、ドラッグ開始時または定期的にコンテナの `getBoundingClientRect()` を取得し、基準点（`top`, `left`）を把握します。

#### 2. スタイル補正ロジックの改善
- `clampDragStyle` 内で、`top` と `left` がスタイルに含まれている場合、以下の式で補正します。
  - `corrected_top = (dnd_top - container_top) / currentScale`
  - `corrected_left = (dnd_left - container_left) / currentScale`
- `transform` の `translate` も同様に `scale` で除算します。

#### 3. X軸の固定の再検討
- 並び替えは縦方向のみのため、ドラッグ中の X 座標を 0 に固定する（`clampXMin: 0, clampXMax: 0`）設定を復活させ、横方向の逃げを確実に封じます。

## 検証計画

### 手動確認
1. カードエディタを縮小表示状態で開く。
2. ブロック（テキストブロック以外など、ドラッグ可能なもの）を掴む。
3. 掴んだ瞬間に位置が飛ばず、マウスカーソルに追従することを確認する。
4. 縦方向に動かした際、期待通りに並び替えができることを確認する。
