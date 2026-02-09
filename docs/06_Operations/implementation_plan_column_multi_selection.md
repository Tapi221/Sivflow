# カラム表示への複数選択機能（エクスプローラー風）の実装計画

カラム表示（Finderスタイル）において、ツリー表示と同様に「選択モード」を有効にし、複数のフォルダを一括で選択・操作（削除など）できるようにします。

## 変更内容

### フォルダカラムコンポーネント

#### [MODIFY] [FolderColumn.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderColumn.tsx)
- **プロップスの追加**:
    - `isSelectionMode: boolean`
    - `selectedFolderIds: string[]`
    - `onToggleSelection: (id: string) => void` を追加します。
- **チェックボックスの追加**:
    - `isSelectionMode` が真の場合、フォルダアイコンの左側に `Checkbox` コンポーネントを表示します。
    - チェックボックスのクリックで `onToggleSelection` を呼び出します（`e.stopPropagation()` を忘れずに）。

### カラムナビゲーター

#### [MODIFY] [ColumnNavigator.tsx](file:///c:/FlashcardMaster/src/Components/folder/ColumnNavigator.tsx)
- **プロップスの追加と中継**:
    - `isSelectionMode`, `selectedFolderIds`, `onToggleSelection` を受け取り、各 `FolderColumn` へ渡します。

### フォルダ管理画面

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- **プロップスの伝達**:
    - `ColumnNavigator` および `FolderTree` の呼び出し箇所で、`isSelectionMode`, `selectedFolderIds`, `onToggleSelection` を正しく渡すように修正します。

## 検証計画

### 手動確認
1. フォルダ管理画面で「選択」ボタンをクリックし、選択モードを開始する。
2. カラム表示において、各フォルダの横にチェックボックスが表示されることを確認する。
3. 複数のフォルダにチェックを入れ、ヘッダーに「削除 (N)」と表示されることを確認する。
4. 「削除」を実行し、選択したフォルダが一括で削除されることを確認する。
5. ツリー表示に切り替えても、同様に選択機能が動作することを確認する。
