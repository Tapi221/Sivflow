# テキストブロックの余白削減の実装計画

カードエディタのテキストブロックおよびその他のブロックにおいて、入力エリアと枠線の間の余白（パディング）が大きすぎるため、これを削減して画面をより有効に活用し、視覚的なバランスを改善します。

## 修正内容

### 1. テキストブロックの余白削減
`TextBlock.tsx` において、`AutoResizeTextarea` に適用されているパディングを `px-6 py-4` から `px-4 py-2` に削減します。
これに合わせ、フォントサイズや行間も微調整し、よりコンパクトに表示されるようにします。

### 2. 数式ブロックの余白削減
`MathBlock.tsx` において、コンテンツを包む `div` のパディングを `px-6 py-4` から `px-4 py-2` に削減します。
また、LaTeX入力エリアのパディング `px-4 py-3` も削減を検討します。

### 3. メモブロックの余白削減
`MemoBlock.tsx` において、`AutoResizeTextarea` のパディングを `p-6` から `p-4` に削減し、角丸も少し調整します。

### 4. ブロックラッパーの調整
`BlockWrapper.tsx` において、全体のパディング `p-1.5` (6px) を見直し、全体のコンパクさを向上させます。

## 変更ファイル

- [MODIFY] [TextBlock.tsx](file:///c:/FlashcardMaster/src/components/card/blocks/TextBlock.tsx)
- [MODIFY] [MathBlock.tsx](file:///c:/FlashcardMaster/src/components/card/blocks/MathBlock.tsx)
- [MODIFY] [MemoBlock.tsx](file:///c:/FlashcardMaster/src/components/card/blocks/MemoBlock.tsx)
- [MODIFY] [BlockWrapper.tsx](file:///c:/FlashcardMaster/src/components/card/blocks/BlockWrapper.tsx)

## 検証計画

### 手動確認
- カード編集画面を開き、テキストブロックの余白が適切に削減されているか確認する。
- 数式ブロックやメモブロックについても同様に余白が削減されているか確認する。
- モバイル表示時にも崩れがなく、操作しやすいことを確認する。
