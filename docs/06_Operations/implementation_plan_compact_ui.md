# ブロックUIの余白削減とコンパクト化の計画

## 概要
ユーザーからの「テキスト入力欄の縦の長さをできる限り縮小したい」という要望に基づき、カードエディタ内の各ブロックコンポーネントの余白（Padding）、間隔（Margin）、および入力欄の最小行数（minRows）を削減し、より高密度でコンパクトなUIを実現します。

## 変更内容

### [Component] Card Blocks

#### [MODIFY] [TextBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/TextBlock.tsx)
- `AutoResizeTextarea` の `minRows` を 2 から 1 に変更
- 入力欄のパディングを `px-4 py-3` から `px-3 py-1.5` に削減

#### [MODIFY] [MemoBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/MemoBlock.tsx)
- `AutoResizeTextarea` の `minRows` を 2 から 1 に変更
- 背景エリアのパディングを `p-4` から `px-3 py-2` に削減

#### [MODIFY] [MathBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/MathBlock.tsx)
- コンテナの垂直方向の間隔を `space-y-4` から `space-y-2` に削減
- 外枠のパディングを `px-4 py-3` から `px-3 py-1.5` に削減
- `AutoResizeTextarea` の `minRows` を 3 から 1 に変更
- ラベル下の余白 `mb-2` を `mb-1` に削減
- プレビューエリアのパディングを `p-6` から `p-3` に削減

## 検証計画

### 手動検証
1. カード編集画面を開き、各ブロック（テキスト、メモ、数式）を追加する。
2. 未入力状態および1行入力状態での縦幅が以前よりも大幅に縮小されていることを確認する。
3. 数式ブロックにおいて、入力欄とプレビューの密度が適切であることを確認する。
4. モバイル表示においても、クリックしやすさを損なわない範囲でコンパクトになっているか確認する。
