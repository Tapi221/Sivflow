# リンクブロック制限の追加計画

リンクブロックの追加を、一つのカード（問題・解答セクション全体）につき最大1回までに制限します。

## 変更内容

### 1. [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)
- 現在の `formData.questionBlocks` と `formData.answerBlocks` をスキャンし、`type: 'reference'` のブロックが既に存在するかを判定する変数 `hasLinkBlock` を定義します。
- `BlockEditor` コンポーネントに `canAddLink` プロパティ（`!hasLinkBlock`）を渡します。

### 2. [BlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/BlockEditor.tsx)
- `BlockEditorProps` に `canAddLink` を追加します。
- ツールバー内の「リンク」追加ボタンの `disabled` 属性に `!canAddLink` を設定します。
- デザイン上のフィードバックとして、無効化時はボタンの不透明度を下げるなどの調整を行います。
- 複製ボタンについても、`type: 'reference'` かつ既にカード内に存在する場合は、反対側への複製などを制限または無視するようにします。

## 検証計画

### 自動テスト / ビルド確認
- `npm run build` でコンパイルエラーがないことを確認。

### 手動検証
1. カード編集画面を開く。
2. 「問題」セクションに「リンク」ブロックを追加する。
3. 問題側のツールバーおよび「解答」側のツールバーの両方で「リンク」ボタンが無効化されていることを確認する。
4. リンクブロックを削除し、再びボタンが有効になることを確認する。
5. （考慮事項）既存のリンクブロックを複製しようとした際の挙動を確認する。
