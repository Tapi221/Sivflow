# 実装計画：テキスト・コードブロックの縦幅最適化（完結編）

指摘された「まだ1行分でない」原因は、`index.css` の `.card-shell-body` から継承されている `line-height: 24px` です。これにより、1行の入力でも最低 24px の高さが確保され、外枠のボーダーを含めると 28px 以上になってしまっています。

これを強制的に 20px に上書きし、ボーダー込みで 24px に収まるようにします。

## 変更内容

### 1. テキストブロックの継承上書き
#### [MODIFY] [TextBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/TextBlock.tsx)
- `style` プロパティを追加し、`lineHeight: '20px !important'` を指定します。
- これにより、継承された 24px ではなく強制的に 20px の行高を適用します。

### 2. オートリサイズ計算の精度向上
#### [MODIFY] [AutoResizeTextarea.tsx](file:///c:/FlashcardMaster/src/Components/ui/AutoResizeTextarea.tsx)
- 計算時にも 20px をベースにし、1行入力時の `scrollHeight` が 24px にならないようにします。

### 3. 操作用ボタンの更なる圧縮
#### [MODIFY] [BlockWrapper.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/BlockWrapper.tsx)
- ブロックのボーダー幅を `border-2` (2px) から `border` (1px) に変更することを検討します。
- もしくは、高さを 20px にした内部に合わせてパディングをマイナスにするなどの工夫をします。
- 今回はまず `line-height` の強制上書きを優先します。

## 検証計画

### 手動確認
- カード編集画面でテキストブロックを追加。
- 以下の点を確認：
1. **テキストの高さ**: マウスで選択した際の青い領域（セレクション）が、以前より薄くなっていること。
2. **24pxグリッドへの完全一致**: 空のテキストブロックが罫線1行分（24px）と上下ピクセル単位で一致すること。
3. **垂直方向の中央揃え**: テキストが上下に偏らず、中央に配置されていること。
