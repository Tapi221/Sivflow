# カード閲覧時のテキスト選択防止

## 概要
カード閲覧機能（`Flashcard` コンポーネント）において、テキスト選択を無効化し、スワイプ操作や意図しない選択を防止する。

## 実装計画
- [ ] `Flashcard.tsx` の修正
    - [ ] `select-text` の削除
    - [ ] `select-none` の適用（ルート要素）

## 影響範囲
- カード閲覧画面 (`StudyCard.tsx`, `CardViewer.tsx`)
- 編集画面のプレビュー (`CardEditor.tsx`)
- `BlockEditor.tsx` には影響しない（`Flashcard` を使用していないため）

## 手順
1. `src/Components/card/Flashcard.tsx` を編集し、クラスを変更する。
