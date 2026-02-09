# KaTeX 表示崩れ修正計画書 (Layout Fix)

KaTeX を用いた数式レンダリングにおいて、複数行入力時や特定の記号（\sum, \int等）使用時に表示が右側に縦長に崩れる問題を修正します。

## 設計原則・禁止事項

1.  **描画責務の分離**: 数式の `display` / `inline` 判定は**「ブロック構文レベル（呼び出し側）で一意に決定」**する。`MathRenderer` は受け取った `displayMode` に基づいて描画するだけの専用コンポーネントとし、内部で勝手な推論や上書きを行わない。
2.  **内部 CSS 操作の禁止**: KaTeX が生成する内部クラス（`.base`, `.katex-html`, `.mord` 等）には、**原則として直接 CSS を適用しない**。レイアウト制御（中央揃え、スクロール等）は、必ず外側のラッパー要素のみで行う。
3.  **!important の原則禁止**: 特定のスタイルを強制するための `!important` は使用せず、KaTeX 本来の数式組み立てロジックを尊重する。

## 問題の本質的分析

1.  **CSS オーバーライドの不備**: `index.css` 内で KaTeX の内部クラス（`.base`, `.katex-html` 等）に対して `display: block !important` や `white-space: normal !important` を適用しており、これが KaTeX 本来の数式組み立てロジック（インライン配置と精密な位置調整）を破壊しています。
2.  **右寄せ・縦積みの原因**:
    -   `white-space: normal` により、本来横に並ぶべき要素が改行される。
    -   親コンテナが `flex justify-center` 等を持っている場合、崩れた要素が不自然な位置（右端に見えるなど）に配置される。
    -   特にモバイル対応を意識した「自動折り返し」設定が、数式構造を無視して適用されている。
3.  **コンテナ構造の重複**: `MathBlock.tsx`, `MathRenderer.tsx` の両方で `flex` や `justify-center` が設定されており、KaTeX 自体が生成する `.katex-display` （デフォルトで `text-align: center`）と競合している。

## 修正方針

1.  **標準スタイルへの回帰**: 内部構造を破壊する `!important` 付きの CSS を削除し、KaTeX 公式のスタイルが正しく適用されるようにします。
2.  **スクロールによる対応**: 数式（特に display math）は構造的に折り返しが難しいため、基本は `overflow-x: auto` による横スクロールで対応し、レイアウト崩れを防ぎます。
3.  **レイアウトの簡素化**: `MathRenderer` は余計な `flex` を持たず、KaTeX の `displayMode` オプションに任せる形に整理します。

## 変更内容

### 1. CSS 修正 ([index.css](file:///c:/FlashcardMaster/src/index.css))
- [DELETE] `.katex-display` 周辺の過剰なスタイル上書きを削除。
- [NEW] 安全な横スクロール用ラッパーの定義を追加。

### 2. コンポーネント修正 ([MathRenderer.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/MathRenderer.tsx))
- `flex` と `justify-center` を削除し、KaTeX 本来の `displayMode` による中央揃えを利用。
- コンテナのクラスを整理。

### 3. ブロック修正 ([MathBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/MathBlock.tsx))
- プレビュー領域の `flex items-center` が数式の高さを誤認させる可能性があるため、padding 等による調整に変更。

## 検証計画

### テストケース
1.  **複数行数式**: `\begin{cases} ... \end{cases}` や `\begin{aligned} ... \end{aligned}` が正しく表示されるか。
2.  **Display Math**: `\sum_{i=0}^n` 等の上下の添え字がズレずに表示されるか。
3.  **長大数式**: 画面幅を超える数式が（崩れずに）横スクロールできるか。

### 検証項目
- PC での表示確認。
- モバイルでの横スクロール確認。
- **再発防止の確認**: `index.css` から KaTeX 内部クラスへの依存が排除されているか。
