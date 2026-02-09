# マウスドラッグによる範囲選択機能（ドラム選択）の実装計画

デスクトップのエクスプローラーのように、空きスペースからマウスをドラッグして四角形の範囲を描画し、その範囲内に含まれるフォルダを一括で選択できる機能を追加します。

## 変更内容

### 識別用属性の追加
ヒットテスト（当たり判定）を容易に行うため、各フォルダアイテムのDOM要素にカスタム属性を付与します。

#### [MODIFY] [FolderTree.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTree.tsx)
- フォルダの各行（Row）要素に `data-selectable-id={`folder:${folderId}`}` を追加します。

#### [MODIFY] [FolderColumn.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderColumn.tsx)
- フォルダアイテムのコンテナ要素に `data-selectable-id={`folder:${folderId}`}` を追加します。

### 範囲選択ロジックの実装

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- **状態管理**:
    - `selectionRect`: 現在描画中の矩形の座標とサイズ `{ x, y, width, height }`
    - `dragStart`: ドラッグ開始地点 `{ x, y }`
- **マウスイベントハンドラ**:
    - コンテナの `onMouseDown`: ドラッグ開始。既に選択モードでない場合は自動で有効化することを検討。
    - ウィンドウの `onMouseMove` (ドラッグ中): 矩形のサイズ更新。
    - ウィンドウの `onMouseUp`: 矩形内のアイテムを特定し、`selectedFolderIds` を更新。
- **ヒットテストロジック**:
    - `getBoundingClientRect()` を用いて、各アイテムの矩形と選択範囲の矩形が交差しているか判定します。

### UI表示

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- 選択範囲を示す半透明の青い矩形（オーバーレイ）を計算された `selectionRect` に基づいて描画します。

## 検証計画

### 手動確認
1. カラム表示またはツリー表示の余白部分からマウスドラッグを開始する。
2. ドラッグ中に半透明の選択矩形が表示されることを確認する。
3. 矩形を広げ、複数のフォルダを囲う。
4. マウスを離した際、囲われたフォルダのチェックボックスがオンになることを確認する。
5. 選択されたフォルダに対して一括削除などの操作が正常に行えることを確認する。
