# 作業完了報告：音声ブロックとリンクブロックの複製ボタン非表示化

音声ブロックとリンクブロックにおいて、複製（Duplicate）ボタンが表示されないように修正を完了しました。

## 実施内容

### 1. 共通コンポーネントの機能拡張
`src/Components/card/blocks/BlockWrapper.tsx` に `showDuplicate` プロパティを追加しました。これにより、ブロックごとに複製ボタンの表示・非表示を制御できるようになりました。

### 2. 音声ブロックの修正
`src/Components/card/blocks/MediaBlock.tsx` において、`type === 'audio'` （音声ブロック）の場合に `showDuplicate={false}` を指定するように変更しました。

### 3. リンクブロックの修正
`src/Components/card/blocks/ReferenceBlock.tsx` において、常に `showDuplicate={false}` を指定するように変更しました。

## 確認事項
- [x] `docs/06_Operations/implementation_plan_hide_duplicate_for_specific_blocks.md` の作成
- [x] 音声ブロックでの複製ボタン非表示化
- [x] リンクブロックでの複製ボタン非表示化
- [x] 他のブロック（テキスト等）で複製ボタンが表示され続けることの確認

以上の修正により、ユーザーが意図せず同一カード内に複数の音声・リンクブロックを作成してしまう混乱を防ぐことができます。
