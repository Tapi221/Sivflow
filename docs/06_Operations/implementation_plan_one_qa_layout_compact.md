# 一問一答モードのレイアウト最適化（縦幅削減）

一問一答モードにおいて、ブロック追加ボタンより上の部分（ヘッダーや余白）の縦幅を短縮し、より多くのコンテンツを一度に表示できるようにします。

## 変更内容

### 1. OneQAMode.jsx の調整
- カードコンテナのトップパディングを削減します。
- モバイル表示でのアクションボタン（ドラッグ、削除）の配置とパディングを最適化します。

#### [MODIFY] [OneQAMode.jsx](file:///c:/FlashcardMaster/src/Pages/OneQAMode.jsx)
- `pt-12 md:pt-6` を `pt-9 md:pt-5` 程度に削減。
- アクションボタンの配置を微調整。

### 2. CardEditor.tsx の調整
- 全体の `space-y-4 md:space-y-6` を削減します。
- トップバナー（Q番号やタイトル入力）の余白を詰め、コンパクトにします。

#### [MODIFY] [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)
- ルートの `space-y-4 md:space-y-6` を `space-y-2 md:space-y-4` に削減。
- トップバナー内の `gap-4 md:gap-7` を `gap-2 md:gap-4` に短縮。
- セクションヘッダー（問題・解答）の `mb-2 md:mb-6` を削減。

### 3. BlockEditor.tsx の調整
- ブロック追加ツールバーのヘッダー部分をコンパクトにします。

#### [MODIFY] [BlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/BlockEditor.tsx)
- `flex-col md:flex-row` を `flex-row items-center` に変更（モバイルでも横並び）。
- `gap-4` を `gap-3` に削減。
- コンテナの `space-y-6` を `space-y-4` に削減。

## 検証計画

### 自動テスト
- ビルドが正常に通ることを確認: `npm run build`

### 手動確認
1. ブラウザで「一問一答モード」を開く。
2. デスクトップ表示で、ヘッダー部分が以前よりコンパクトになっていることを確認。
3. モバイル表示で、上部の余白が適切に削減されているか確認。
