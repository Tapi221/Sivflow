# カード作成フローの実装計画

## 概要
カード作成ボタン押下時のフローを変更し、「モード連続作成」と「個別作成」の分岐を実装します。
これにより、将来的な多機能化（一問一答、4択など）に向けた基盤を整えます。

## ユーザーレビューが必要な事項
- 特になし（UI/UXの変更のみ）

## 変更内容

### Components
#### [NEW] [CreateCardSelectionDialog.jsx](file:///c:/FlashcardMaster/src/Components/card/CreateCardSelectionDialog.jsx)
- カード作成ボタン押下時に表示するモーダルコンポーネント
- 以下の2つの選択肢を表示
    1. **モード連続作成**: `CreationModeList` 画面へ遷移
    2. **個別作成**: 従来の `CardEdit` 画面へ遷移

### Pages
#### [MODIFY] [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)
- `CreateCardSelectionDialog` の導入と状態管理 (`isCreateCardDialogOpen`) の追加
- `handleEditCard` 関数を修正し、新規作成時（引数がnullの場合）はダイアログを表示するように変更
- デスクトップ版の「新規カード」ボタンの `onClick` 処理も同様に変更

#### [NEW] [CreationModeList.jsx](file:///c:/FlashcardMaster/src/Pages/CreationModeList.jsx)
- **モード連続作成** 選択時に遷移する画面
- 以下のモード一覧を表示（現時点では仮実装）
    - 一問一答
    - 4択
    - 多答
    - 並び替え
- 各アイテムをクリックすると、プレースホルダー画面へ遷移

#### [NEW] [NotImplementedPlaceholder.jsx](file:///c:/FlashcardMaster/src/Pages/NotImplementedPlaceholder.jsx)
- 未実装機能を選択した際に表示する仮画面
- 「未実装です」というメッセージを表示し、元の画面に戻るボタンを配置

#### [MODIFY] [App.tsx](file:///c:/FlashcardMaster/src/App.tsx)
- 新しい画面へのルーティングを追加
    - `/create-mode`: `CreationModeList`
    - `/create-mode/placeholder`: `NotImplementedPlaceholder`

## 検証計画

### 手動検証
1. **カード作成モーダルの表示確認**
    - `FolderView` で「新規カード」ボタン（デスクトップ）またはEmpty Stateの「新規カードを作成」カードをクリックする。
    - `CreateCardSelectionDialog` が表示されることを確認する。

2. **「個別作成」フローの確認**
    - ダイアログで「個別作成」を選択する。
    - 従来のカード作成画面 (`/CardEdit`) に遷移することを確認する。

3. **「モード連続作成」フローの確認**
    - ダイアログで「モード連続作成」を選択する。
    - モード一覧画面 (`/create-mode`) に遷移することを確認する。

4. **モード一覧画面の動作確認**
    - 表示されているモード（一問一答など）をクリックする。
    - 「未実装です」画面に遷移することを確認する。
