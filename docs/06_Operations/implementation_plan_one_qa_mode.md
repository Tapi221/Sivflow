# 一問一答モード（One QA Mode）実装計画

## 1. 目的
「最短操作で大量のカードを連続作成すること」を目的とした、一問一答形式の専用作成画面を実装します。
マウス操作を最小限にし、キーボード（特にEnterキー）のみで完結する操作性を目指します。

## 2. ユーザーレビューが必要な事項
- **保存時の挙動**: 完了していない（片方しか入力していない）カードは保存対象外として破棄するか、警告を出すか。
  - **仕様**: v1では、どちらか片方のみ入力のカードがある場合は保存時に警告を表示し、保存（作成完了）させない方針で実装します。
- **UIデザイン**: 既存の `CardEditor` とは全く異なるシンプルなリスト形式のUIとなります。

## 3. 変更内容

### ルーティングとナビゲーション
#### [MODIFY] [App.tsx](file:///c:/FlashcardMaster/src/App.tsx)
- 新規ルート `/one-qa-mode` を追加します。
- クエリパラメータ `?folderId=...` で保存先フォルダを受け取ります。

#### [MODIFY] [CreationModeDialog.jsx](file:///c:/FlashcardMaster/src/Components/card/CreationModeDialog.jsx)
- 「一問一答」選択時に、上記の新規ルートへ遷移する処理を追加します。
- 現在は `onSelectMode` で親に返していますが、ここから直接遷移するか、親 (`FolderView`) で遷移処理を実装します。
  - **方針**: `FolderView.jsx` の `handleSpecificModeSelect` を修正して遷移させます。

#### [MODIFY] [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)
- `handleSpecificModeSelect` に分岐処理を追加し、`qa` モードの場合は `/one-qa-mode` へ遷移させます。

### 新規コンポーネント実装
#### [NEW] [OneQAMode.jsx](file:///c:/FlashcardMaster/src/Pages/OneQAMode.jsx)
- メインのページコンポーネント。
- **State管理**:
  - `cards`: `{ id: string, question: string, answer: string }[]`
  - `focusedField`: `{ cardIndex: number, field: 'question' | 'answer' }`
- **機能**:
  - 初期表示時に空のカードを1つ生成。
  - **Enterキーハンドリング**:
    - 問題欄でEnter → 解答欄へフォーカス移動。
    - 解答欄でEnter → 次のカードの問題欄へ移動（なければ新規作成して移動）。
    - 入力が空の場合は移動しない等の制御。
  - **Shift+Enter**: 改行入力。
  - **保存処理**: `useCards` フックの `createCard` をループで呼び出し一括登録。

#### [NEW] [OneQACardRow.jsx](file:///c:/FlashcardMaster/src/Components/card/OneQACardRow.jsx) (Optional)
- 各行の入力フォーム（問題・解答）をコンポーネント化し、`OneQAMode.jsx` の肥大化を防ぎます。
- `ref` を使用してフォーカス制御を行います。

## 4. 検証計画

### 自動テスト
- 現状、E2Eテスト環境が整備されていないため、今回は手動検証を主とします。

### 手動検証手順 (Manual Verification)
1. **画面遷移確認**
   - フォルダ画面を開く。
   - 「新規カード」→「モード連続作成」→「一問一答」を選択。
   - `/one-qa-mode` に遷移することを確認。

2. **入力・フォーカス移動確認**
   - 1枚目の「問題」にテキスト入力 → Enter → 「解答」にフォーカス移動。
   - 1枚目の「解答」にテキスト入力 → Enter → 2枚目のカードが作成され、「問題」にフォーカス移動。
   - Shift+Enter で改行されることを確認。

3. **保存・バリデーション確認**
   - 片方のみ入力して「保存」→ エラー/警告が表示されること。
   - 全て入力して「保存」→ 完了メッセージと共にフォルダ画面に戻る。
   - フォルダ画面で作成したカードが正しく表示されること。

4. **一括保存後の並び順確認**
   - 登録順（上から順）に `orderIndex` が保たれているか確認。
