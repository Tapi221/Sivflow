# 4択モード実装計画

## 概要
ユーザーの要望に基づき、新しいカード作成モード「4択モード」を実装します。
このモードでは、初期状態で問題側に5つのテキストブロック、解答側に1つのテキストブロックが配置され、問題文や選択肢の入力欄として機能します。
また、問題側の「正解」ブロックに入力した内容が、解答側のブロックに自動的にリンク（同期）されるようにします。

## 具体的な仕様
1.  **初期表示**
    -   **問題側 (Question Blocks)**: 5つのテキストブロック
        1.  `[0]`: 文字色グレーで「問題文」 (Problem Statement)
        2.  `[1]`: 文字色グレーで「正解の選択肢」 (Correct Answer)
        3.  `[2]`: 文字色グレーで「不正解の選択肢」 (Incorrect Answer)
        4.  `[3]`: 文字色グレーで「不正解の選択肢」 (Incorrect Answer)
        5.  `[4]`: 文字色グレーで「不正解の選択肢」 (Incorrect Answer)
    -   **解答側 (Answer Blocks)**: 1つのテキストブロック
        1.  `[0]`: 自動入力用（初期は空、または正解ブロックと同期）

2.  **機能 (Linking)**
    -   問題側の 2番目（Index 1）のブロック「正解の選択肢」に入力されたテキストを、解答側の 1番目（Index 0）のブロックにリアルタイムで反映させます。

3.  **UI/UX**
    -   一問一答モードと同様の連続作成UI (`FourChoiceMode` ページ) を提供。
    -   プレースホルダーとして各ブロックに役割を明示。

## 変更内容

### 1. `src/Components/card/CardEditor.tsx`
-   props に `mode` (`'default' | 'four_choice'`) を追加。
-   初期化ロジック (`useEffect`) に `mode === 'four_choice'` の場合の分岐を追加。
    -   指定の5ブロック+1ブロック構成で初期化。
    -   `defaultToTextBlock` のロジックよりも優先する。
-   同期ロジック (`useEffect`) を追加。
    -   `mode === 'four_choice'` の時、`formData.questionBlocks[1]` の内容を `formData.answerBlocks[0]` にコピーする。
-   `BlockEditor` への `customPlaceholders` 渡しを実装。
    -   モード固有のプレースホルダーMapを作成し、`BlockEditor` に渡す。

### 2. `src/Components/card/BlockEditor.tsx`
-   props に `customPlaceholders: Record<number, string>` を追加。
-   `TextBlock` のレンダリング時に、`index` が `customPlaceholders` に存在する場合、そのテキストを `placeholder` プロパティとして渡す。

### 3. `src/Components/card/blocks/TextBlock.tsx`
-   既に `placeholder` prop を受け取っているか確認し、受け取っていなければ追加して `AutoResizeTextarea` に渡す。

### 4. `src/Pages/FourChoiceMode.jsx` (新規作成)
-   `OneQAMode.jsx` をコピーまたは参考に作成。
-   `CardEditor` に `mode="four_choice"` を渡す。
-   タイトルの変更（「4択問題の作成」など）。

### 5. `src/App.tsx`
-   新規ルート `/four-choice-mode` を追加。

### 6. `src/Pages/FolderView.jsx`
-   `handleSpecificModeSelect` で `modeId === 'choice'` の場合に `/four-choice-mode` へ遷移するよう変更。

## 検証計画

### 手動検証手順
1.  **モード起動**
    -   フォルダ詳細画面で「新規カード」>「4択問題」を選択。
    -   新しく作られた`/four-choice-mode`画面に遷移することを確認。
2.  **初期表示確認**
    -   問題側に5つのテキストブロックが表示されていること。
    -   それぞれのプレースホルダーが「問題文」「正解の選択肢」「不正解の選択肢」となっていること。
    -   プレースホルダーがグレーで表示されていること（標準のplaceholderスタイル）。
    -   解答側に1つのテキストブロックが表示されていること。
3.  **同期動作確認**
    -   問題側の2番目（正解の選択肢）に "Apple" と入力する。
    -   解答側のブロックに自動的に "Apple" が入力されることを確認。
    -   問題側の他のブロック（問題文や不正解）を入力しても、解答側には影響しないことを確認。
4.  **保存動作**
    -   カードを保存し、正しくデータが永続化されることを確認。
