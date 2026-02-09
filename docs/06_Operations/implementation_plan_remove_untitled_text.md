# 実装計画: 「無題のカード」表記の削除

## 概要
ユーザーの要望に基づき、タイトルやテキストがないカードに対して表示されていた「無題のカード」というプレースホルダーテキストを削除します。
代わりに、可能な限り「質問テキスト」を表示し、それもない場合は空欄とします。

## 変更内容

### 1. [src/Components/card/CardList.tsx](file:///c:/FlashcardMaster/src/Components/card/CardList.tsx)
*   `CardItem` コンポーネント内のタイトル表示ロジックを変更します。
*   現状: `{card.title || card.questionText || card.question_text || '無題のカード'}`
*   変更: `{card.title || card.questionText || card.question_text}`

### 2. [src/Pages/Dashboard.jsx](file:///c:/FlashcardMaster/src/Pages/Dashboard.jsx)
*   ドラフト（作成中）カードセクションの表示ロジックを変更します。
*   現状: `const title = card.title || '無題のカード';`
*   変更: `const title = card.title || card.questionText || card.question_text;`

## 検証計画
1.  **タイトルなし・質問テキストあり**のカードを作成し、「無題のカード」ではなく質問テキストが表示されることを確認する。
2.  **タイトルなし・質問テキストなし**のカード（作成直後のドラフトなど）がある場合、何も表示されない（またはレイアウトが崩れない）ことを確認する。
3.  ビルドし、本番環境へデプロイする。
