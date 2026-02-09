# カラム表示でのインラインフォルダ作成機能の実装

## 目的
カラム表示（Finder/エクスプローラ形式）において、新しいフォルダを作成する際にポップアップダイアログを表示するのではなく、リストの最下部に直接入力フィールドを表示し、そこで名称を決定して作成できるようにします。

## 提案される変更点

### 1. フォルダカラムコンポーネント

#### [MODIFY] [FolderColumn.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderColumn.tsx)
- **状態管理の追加**:
    - `isCreatingFolder`: 作成モードかどうかを管理。
    - `newFolderName`: 新しいフォルダ名の入力値を保持。
- **UIの変更**:
    - ヘッダーの `Plus` ボタンクリック時、`isCreatingFolder` を `true` に設定し、リストの最下部へスクロールさせます。
    - リストの最下部に、フォルダアイコンと `input` フィールドを持つ「仮のアイテム」を表示します。
- **イベントハンドラ**:
    - `Enter`: フォルダ作成を実行し作成モードを終了。
    - `Escape`: 作成モードをキャンセル。
    - `onBlur`: 作成確定とキャンセルを適切に処理。

### 2. カラムナビゲーター

#### [MODIFY] [ColumnNavigator.tsx](file:///c:/FlashcardMaster/src/Components/folder/ColumnNavigator.tsx)
- `onQuickCreateFolder` プロップを追加し、`FolderColumn` へ渡します。

### 3. フォルダページ

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- `handleQuickCreateFolder` 関数を実装し、`useFolders` の `createFolder` を直接呼び出すようにします。
- `ColumnNavigator` にこの関数を渡します。

## 検証計画

### 手動確認
1. カラム表示のヘッダーにある `+` ボタンをクリックする。
2. リストの一番下に入力欄が表示されることを確認。
3. 名称を入力して Enter キーを押す。
4. フォルダが実際に作成され、カラムが更新されることを確認。
5. Esc キーでキャンセルできることを確認。
