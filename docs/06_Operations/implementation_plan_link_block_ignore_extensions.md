# リンクブロック拡張機能干渉防止計画

リンクブロックの「URL」および「表示名」入力欄において、パスワードマネージャーやAIアシスタントなどのブラウザ拡張機能が入力支援アイコンを表示させないように調整します。

## Proposed Changes

### [Component Name]
#### [MODIFY] [ReferenceBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/ReferenceBlock.tsx)
- URLおよび表示名の `Input` コンポーネントに以下の属性を追加します。
    - `autoComplete="off"`
    - `spellCheck={false}`
    - `data-lpignore="true"`
    - `data-1p-ignore`
    - `data-form-type="other"`

## Verification Plan

### Automated Tests
```pwsh
npm run build
```

### Manual Verification
1. リンクブロックを追加し、「表示名」入力欄をクリックした際に拡張機能のアイコンが表示されないことを確認します。
