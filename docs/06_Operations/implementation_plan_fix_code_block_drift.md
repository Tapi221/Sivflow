# 不具合修正：表示位置ズレの解消とMarkdownブロックの最小高さ調整

表示モードと編集モードのレイアウトを一貫させ、かつ各ブロックをよりコンパクトに（最短1行で）表示できるように修正します。

## 修正内容

### 1. 垂直オフセットの統一
表示モード（Flashcard）と編集モード（BlockEditor）でコンテンツの開始位置を 24px（1行分）に揃えます。

#### [Flashcard.tsx](file:///c:/FlashcardMaster/src/Components/card/Flashcard.tsx)
- `CardSurface` の `ruledOffsetPx` を `24` に設定。
- コンテンツコンテナの `pt-0` を `pt-6` (24px) に変更。

### 2. Markdownブロックの最小高さ縮小
Markdownブロックが空や1行の場合に、2行分占有してしまう問題を修正します。

#### [markdown-mono.css](file:///c:/FlashcardMaster/src/styles/markdown-mono.css)
- `.markdownBlockPreviewFrame` の `min-height` を `calc(var(--ruled-line-pitch, 24px) * 2)` から `calc(var(--ruled-line-pitch, 24px) * 1)` に変更。

### 3. 表示モードの視覚的調整
#### [CodeRenderer.tsx](file:///c:/FlashcardMaster/src/Components/card/CodeRenderer.tsx)
- 言語ラベルのフォントを `font-sans` に統一し、エディタ側のラベルと見た目を合わせます。

## 検証計画

### 手動確認
1. **位置ズレの解消**: 編集・表示モードを切り替えた際に、コンテンツが上下に動かないことを確認。
2. **Markdownブロックの高さ**: 1行のMarkdown入力時に、ブロックの高さが1行分（24px）に収まっていることを確認。
3. **罫線との整合**: 全てのブロックが罫線のピッチ（24px）に正しく乗っていることを確認。

### 自動検証
- `npm run build` を実行し、型エラーや構文エラーがないことを確認。
