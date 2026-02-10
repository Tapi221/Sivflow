# ペアモードおよび4択モードの画面遷移不具合の修正

ペアモード（Pair Mode）および4択モード（Four Choice Mode）への画面遷移が機能していない問題を修正します。
調査の結果、`PairMode.jsx` ページコンポーネントが存在せず、また `App.tsx` においてこれらのモードに対応するルーティングが設定されていないことが判明しました。

## Proposed Changes

### ページコンポーネントの追加とルーティング設定

#### [NEW] [PairMode.jsx](file:///c:/FlashcardMaster/src/Pages/PairMode.jsx)
- `OneQAMode.jsx` をベースに、`CardEditor` の `mode="pair"` を指定した新しいページコンポーネントを作成します。
- ヘッダー部分のラベルを「ペアモード」に、説明文を「用語と意味をペアで入力」のように調整します。

#### [MODIFY] [App.tsx](file:///c:/FlashcardMaster/src/App.tsx)
- `PairMode` および `FourChoiceMode` を lazy import に追加します。
- `/pair-mode` および `/four-choice-mode` のルートを追加します。

## Verification Plan

### Automated Tests
- `npm run build` を実行し、ビルドエラーが発生しないことを確認します。

### Manual Verification
1. フォルダ詳細画面（`FolderView`）を開きます。
2. 「新規カード」ボタンのドロップダウンから「連続作成」を選択します。
3. モード選択ダイアログで「ペアモード」を選択し、`/pair-mode` に正常に遷移することを確認します。
4. 同様に「4択モード」を選択し、`/four-choice-mode` に正常に遷移することを確認します。
5. 各モードでカードが正常に保存できることを確認します。
