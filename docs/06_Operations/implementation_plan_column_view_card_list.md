# カラム表示へのカード一覧表示機能の追加

## 目的
カラム表示モードにおいて、フォルダを選択した際にそのフォルダ直下のカードも一覧表示されるようにします。これにより、Finderのような感覚でフォルダ階層を辿りながらカードを探すことができるようになります。

## 提案される変更点

### 1. カラムナビゲーター

#### [MODIFY] [ColumnNavigator.tsx](file:///c:/FlashcardMaster/src/Components/folder/ColumnNavigator.tsx)
- **handleFolderClick の変更**:
    - 次のカラムを表示するかどうかの判定 (`hasChild`) に、そのフォルダ直下にカードが存在するかどうかのチェックを追加します。
    - 名称を `hasContent` などに改名し、子フォルダまたはカードがあれば `newPath.push(folderId)` されるようにします。

### 2. フォルダカラムコンポーネント

#### [MODIFY] [FolderColumn.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderColumn.tsx)
- **カード一覧の取得**:
    - `parentId` に直接属するカード（削除されていないもの）をフィルタリングします。
- **UIの追加**:
    - フォルダリストの後に、カードリストを表示するセクションを追加します。
    - カードはファイル風のアイコン（`FileText` など）で表示し、クリックでそのカードを選択/開くようにします。
- **イベントハンドラ**:
    - `onCardClick` などのプロップを新規追加し、`ColumnNavigator` 経由で `Folders.jsx` の遷移処理に繋げます。

### 3. カラム表示全体の統合

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- `ColumnNavigator` にカードがクリックされた際のハンドラを渡し、カード編集/閲覧画面への遷移（`onCardSelect` 等）を実装します。

## 検証計画

### 手動確認
1. カラム表示において、カードが含まれるフォルダをクリックする。
2. 次のカラムが表示され、その中にカードが一覧表示されることを確認。
3. カードをクリックすると、そのカードの内容が表示される（または編集画面が開く）ことを確認。
4. フォルダとカードが混在する場合、フォルダが先に表示され、その後にカードが表示されることを確認。
