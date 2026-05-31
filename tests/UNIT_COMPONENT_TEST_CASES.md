## tests/unit/chip/eventchip/EventChip.spacing.test.tsx

- [ ] 週表示の通常チップはタイトルと時刻の間隔を小さく保つ
- [ ] リスト表示のチップもタイトルと時刻の間隔を小さく保つ
- [ ] リスト表示と週表示のタイトルと時刻の間隔を一致させる
- [ ] チップ本体の下に白い line mask を置いてグリッド線だけを隠す
- [ ] チップ本体の色トークンと透明度は line mask に移さず維持する
- [ ] 通常チップの 1 行タイトルは固定 line-height で表示する
- [ ] 通常チップの時刻も固定 line-height で表示する
- [ ] 通常チップの時刻は横幅が狭い時に折り返せる

## tests/unit/components/card/blocks/MarkdownBlockContent.test.tsx

- [ ] Markdown本文は常に左揃えになる
- [ ] 複数段落を個別の p 要素として描画する
- [ ] 段落の後にリストを別ブロックとして描画する
- [ ] 2行空行を空白段落として保持する
- [ ] 本文段落に whitespace 保持用の識別属性を付与する
- [ ] blockquote 内本文にも whitespace 保持用の識別属性を付与する
- [ ] blockquote 内の nested paragraph は whitespace selector の対象外にできる DOM 形になる

## tests/unit/components/card/SharedCardContent.test.tsx

- [ ] view mode では共有 root と view scene を描画する
- [ ] edit mode では共有 root と edit scene を描画する

## tests/unit/components/card/Flashcard.layoutRows.test.tsx

- [ ] flip 前後で同じ高さを維持する

## tests/unit/components/card/MathBlockConsistency.test.tsx

- [ ] viewer and editor-preview path both use mathBlockRoot frame

## tests/unit/components/card/panels/MetaPanelPrimitives.test.tsx

- [ ] 共有 panel styling contract を 1 か所に保つ
- [ ] switch 変更を共有 meta panel wrapper 経由で転送する
