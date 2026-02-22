# CardEditor.tsx の lucide-react インポート修正計画

`CardEditor.tsx` において、`lucide-react` からの `Star` インポートがエラーとして報告されている問題を修正します。調査の結果、`lucide-react` のバージョン (v0.563.0) において、一部のアイコン名が変更されており、それが IDE の混乱を招いている可能性があります。

## 変更内容

### [Components]

#### [MODIFY] [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)

- `lucide-react` からのインポートを最新の命名規則に合わせます。
  - `HelpCircle` -> `CircleHelp`
  - `CheckCircle` -> `CircleCheck`
- `Star` が依然としてエラーになる場合、インポート順序や破壊的変更の有無を再確認しますが、まずは上記のリネームにより型定義の整合性を取ります。

## 検証計画

### 自動テスト
- `npm run typecheck` を実行し、エラーが発生しないことを確認します。

### 手動確認
- カード編集画面を開き、ブックマークアイコン（Star）やヘルプアイコン（CircleHelp）が正しく表示されることを確認します。
