# API Documentation

## Image Upload System

### 1. useReliableFileUpload (Hook)

ユーザーからのファイル入力を受け付け、ローカル保存（Optimistic UI）とバックグラウンドアップロードを一元管理するフック。

#### Usage

```typescript
const { uploadFile, isUploading, uploadStatus, error } = useReliableFileUpload();

const handleUpload = async (file: File) => {
  const result = await uploadFile(
    file, 
    (name) => `users/${uid}/uploads/${name}`,
    { type: 'card_image', cardId: '...' }
  );
  // result.url は即座に表示可能な Blob URL (または既に同期済みの Remote URL)
};
```

#### Returns
- **uploadFile**: `(file, pathGenerator, context?) => Promise<UploadResult>`
    - **UploadResult**:
        - `url`: 表示用URL (Blob URL または Remote URL)
        - `storagePath`: ストレージ上のパス
        - `metadata`: 保存されたメタデータ
- **isUploading**: `boolean` (ローカル保存処理中は true)
- **uploadStatus**: `'idle' | 'uploading' | 'completed' | 'failed'` (ローカル保存のステータス)

### 2. ImageDatabaseWriter (Service)

画像データの IndexedDB / Firestore への保存を担当するローレイヤーサービス。

#### Methods

- **saveLocal(file, metadata)**
    - ファイルを IndexedDB (`images` store) に保存し、Blob URL を発行する。
    - 戻り値: `Promise<UploadedImage>` (localUrl を含む)

- **saveToFirestore(image)**
    - 画像メタデータを Firestore に同期する。

### 3. PersistentOfflineQueue (Service)

オフライン対応の順序保証付きアップロードキュー。

#### Methods

- **enqueue(image, file)**
    - 画像メタデータとファイル本体（ArrayBuffer）を IndexedDB (`offline_upload_queue`) に永続化する。

- **processQueue(uploadFn)**
    - キュー内のアイテムを順次処理する。
    - `uploadFn`: `(file, image) => Promise<UploadedImage>`
        - 実際のアップロード処理を行う関数を注入する。
        - 成功時: DB更新とキューからの削除を行う。
        - 失敗時: リトライカウントをインクリメントし、次回へ持ち越し。

### 4. MediaUploader (Component)

**Props**:
- `onUpload`: `(urls: string[]) => void`
    - アップロード完了（ローカル保存完了）時に Blob URL の配列を返す。

**Behavior**:
- ユーザーがファイルを選択 -> `useReliableFileUpload` を呼び出し。
- 即座に Blob URL を取得し、プレビューを表示。
- バックグラウンドで `PersistentOfflineQueue` が同期を実行。
