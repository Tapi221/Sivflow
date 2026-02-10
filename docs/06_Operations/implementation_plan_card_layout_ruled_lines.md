# カード編集画面のレイアウト最適化と罫線背景の実装計画

カード編集時、プレビュー画面を開かなくても配置（1行単位）が直感的にイメージできるように、初期ブロックの最小高さ確保と、将来のカード背景機能を見据えた「罫線（ruled lines）」の実装を行います。

## ユーザーレビューが必要な事項

> [!IMPORTANT]
> 罫線の間隔は 24px、初期ブロックの最小高さは 44px に設定します。
> これにより、ブロックが「1行分の高さ」を持つことが視覚的に明確になります。

## 変更内容

### 1. グローバルスタイルの更新

#### [MODIFY] [index.css](file:///c:/FlashcardMaster/src/index.css)
- 罫線背景用のCSS変数を定義（`--ruled-line-pitch: 24px` 等）。
- **注意**: 具体的は背景描画（`repeating-linear-gradient`）はここでは行わず、`CardShell` 側に委ねる。
- `.card-shell-body` に `--card-line-height: 24px` を定義し、ブロックがこれを継承するようにベーススタイルを調整。

### 2. カードシェル構造の刷新

#### [MODIFY] [CardShell.tsx](file:///c:/FlashcardMaster/src/Components/card/CardShell.tsx)
- `.card-shell-body` 内部を3層構造に拡張：
    1. **BackgroundLayer**: 実際の背景（罫線等）を描画。
    2. **GuideLayer**: 編集時のみ表示するガイド（点線や境界）。
    3. **ContentLayer**: 実際の `children` を配置。
- 状態管理の統合: `showRuledLines` 等の個別の boolean ではなく、`backgroundStyle: { kind: 'none' | 'ruled', pitch: number, intensity: number }` のような形式で統一的に制御する。

### 3. ブロック編集UIの最適化

#### [MODIFY] [BlockWrapper.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/BlockWrapper.tsx)
- `min-height: 44px` を適用。
- 編集時（hover/focus 時）以外は境界線を薄く（または非表示に）する `GuideLayer` 的な挙動を実装。

#### [MODIFY] [TextBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/TextBlock.tsx)
- 特定の `line-height` をハードコードせず、`CardShell Body` から継承される `--card-line-height` を使用する。
- 罫線のピッチと文字のベースラインが一致するようにパディング等を微調整。

### 4. プレビュー表示の調整

#### [MODIFY] [Flashcard.tsx](file:///c:/FlashcardMaster/src/Components/card/Flashcard.tsx)
- `previewMode` においても `BackgroundLayer`（罫線）を表示できるように `CardShell` への props 渡しを調整。

---

## 検証計画

### 自動テスト / ビルド確認
- `npm run dev` でビルドエラーがないか確認。

### 手動検証
1. **新規カード作成**: ブロックが最初から 44px の高さを持って表示されるか。
2. **罫線の確認**: スクロール領域全体に 24px 間隔の罫線が表示され、コンテンツと一緒にスクロールするか。
3. **グリッド一致**: テキスト入力時、文字のベースラインが罫線に（おおよそ）沿っているか。
4. **プレビュー表示**: プレビュー画面でブロック境界（ガイド）が消え、罫線のみが表示されるか。
