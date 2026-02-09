# 実装計画：音声ブロックとリンクブロックの複製ボタン非表示化

音声ブロックとリンクブロックは、基本的にカード内に1つだけ存在することが想定されているため、複製（Duplicate）ボタンを表示しないように修正します。

## 変更内容

### 1. `src/Components/card/blocks/BlockWrapper.tsx`

- `showDuplicate` プロパティを追加し、デフォルト値を `true` に設定します。
- `showDuplicate` が `false` の場合、複製ボタンをレンダリングしないようにします。

### 2. `src/Components/card/blocks/MediaBlock.tsx`

- `type === 'audio'` の場合、`BlockWrapper` に `showDuplicate={false}` を渡します。

### 3. `src/Components/card/blocks/ReferenceBlock.tsx`

- `BlockWrapper` に `showDuplicate={false}` を渡します。

## 影響範囲

- カード編集画面（CardEditor）内の音声ブロックとリンクブロックの操作パネル。
- 他のブロック（テキスト、コード、画像、数式、メモ）には影響しません。

## 確認事項

- [ ] 音声ブロックを追加し、複製ボタン（Copyアイコン）が表示されないことを確認。
- [ ] リンクブロックを追加し、複製ボタンが表示されないことを確認。
- [ ] テキストブロックなど、他のブロックでは引き続き複製ボタンが表示されることを確認。
