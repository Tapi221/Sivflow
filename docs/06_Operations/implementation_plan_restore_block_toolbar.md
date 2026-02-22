# ブロック追加ツールバーの復旧実装計画

カード編集画面において、新しくブロックを追加するためのボタン（ツールバー）が表示されなくなっている問題を修正します。
ユーザーによって `BlockToolbar.tsx` が GitHub から復旧されましたが、インポート形式の不一致による TypeScript エラーが発生しているため、これを修正し、不要なコードのクリーンアップを行います。

## Proposed Changes

### Card Components

#### [MODIFY] [BlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/BlockEditor.tsx)
- `BlockToolbar` のインポートを、デフォルトインポートから名前付きインポート (`import { BlockToolbar } ...`) に変更し、TypeScriptエラーを解消します。
- `BlockToolbar.tsx` に移譲したアイコン類（`Plus`, `Volume2`, `TypeIcon`, `SigmaIcon` 等）の冗長なインポートを削除し、コードをクリーンアップします。
- 現在の JSX 内での `BlockToolbar` の使用箇所を維持します。

## Verification Plan

### Automated Tests
- `npm run typecheck` を実行し、型エラーがないことを確認します。

### Manual Verification
1. カード編集画面を開き、ブロック追加ツールバーが正しく表示されることを確認する。
2. 各ボタンをクリックしてブロックが追加されることを確認する。
