# 実装計画：複数画像追加時の自動ブロック生成

画像ブロックに複数の画像を追加した際（または既に画像があるブロックに追加しようとした際）、現在のブロックに入りきらない画像を、自動的に新規作成された後続の画像ブロックに割り振る機能を実装します。

## 変更内容

### 1. `src/Components/card/BlockEditor.tsx`

- **Pending Uploads 管理**:
    - `pendingUploads` ステート（`Record<string, File>`）を追加し、新規作成されたブロックIDと、そのブロックでアップロードすべきファイルの対応を管理します。
- **Overflow ハンドリング**:
    - `handleBlockOverflow(blockId: string, files: File[])` 関数を実装します。
    - この関数内で、溢れたファイルの数だけ後続に新規 `image` ブロックを作成します。
    - 新規ブロックのIDをキー、ファイルを値として `pendingUploads` に登録します。
- **Render 修正**:
    - `MediaBlock` コンポーネントに `initialFile`（`pendingUploads[block.id]`）と `onConsumeInitialFile`、`onFilesExcess` を渡します。

### 2. `src/Components/card/blocks/MediaBlock.tsx`

- **Props 追加**:
    - `initialFile?: File`
    - `onConsumeInitialFile?: () => void`
    - `onFilesExcess?: (files: File[]) => void`
- **MediaUploader への伝播**:
    - 受け取った Props をそのまま `MediaUploader` に渡します。

### 3. `src/Components/card/MediaUploader.tsx`

- **Overflow 検知ロジック**:
    - `handleUpload` および `handlePaste` 内で、`maxFiles` を超えるファイル検知ロジックを追加します。
    - `filesToUpload`（現在のブロック用）と `filesExcess`（溢れた分）に分割します。
    - `filesExcess` が存在する場合、親から渡された `onFilesExcess` を呼び出します。
- **Initial File 処理**:
    - `useEffect` を追加し、`initialFile` が渡された場合に、自動的に `handleUpload([initialFile])` を実行します。
    - 実行後、`onConsumeInitialFile` を呼び出して親のステートをクリアします（再実行防止）。

## 検証計画

- [ ] **複数ファイルのドロップ**:
    - 空の画像ブロックに3枚の画像を同時にドロップする。
    - 1枚目が現在のブロックに入り、自動的に2つの画像ブロックが新規作成され、残りの2枚がそれぞれアップロードされることを確認。
- [ ] **追加ドロップ**:
    - 既に画像があるブロックに別の画像をドロップする。
    - 現在のブロックは変更されず、直下に新しいブロックが作られて画像がアップロードされることを確認。
- [ ] **Ctrl+V 貼り付け**:
    - 既に画像があるブロックで Ctrl+V する。
    - 新しいブロックが生成され、貼り付けた画像が入ることを確認。
