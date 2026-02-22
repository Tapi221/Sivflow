# スクロールバーのアクセントカラー適用計画

スクロールバーの色を、ユーザーが設定したアクセントカラー（動的CSS変数）をより直接的に反映するように調整します。

## 変更内容

### [index.css](file:///c:/FlashcardMaster/src/index.css)

グローバルなスクロールバースタイルを更新し、デフォルトのプライマリカラー（400番台）ではなく、ベースのアクセントカラー（600番台）を使用するように変更します。

#### [MODIFY] [index.css](file:///c:/FlashcardMaster/src/index.css)
- `::-webkit-scrollbar-thumb` の `background` を `var(--color-primary-400)` から `var(--color-primary-600-hex)` に変更。
- `::-webkit-scrollbar-thumb:hover` の `background` を `var(--color-primary-600-hex)` から `var(--color-primary-700)` に変更。
- Firefox用の `scrollbar-color` も同様に `var(--color-primary-600-hex)` を使用するように更新。

## 検証計画

### 自動テスト
- 特になし（デザイン変更のため）

### 手動検証
1. 設定画面でアクセントカラーを変更する。
2. アプリ内の各所（サイドバー、メインコンテンツ、カードプレビューなど）でスクロールバーが表示されるまでコンテンツを増やし、スクロールバーの色が設定したアクセントカラーになっていることを確認する。
3. マウスホバー時に色が少し濃くなることを確認する。
