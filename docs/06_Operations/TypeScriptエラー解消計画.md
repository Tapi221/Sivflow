# TypeScriptエラー解消計画

## 背景
`DeviceSyncSettings.tsx` での関数のインポート漏れ、および `StorageUrl` などの branded types (型ブランド) への文字列の代入による型エラーが発生しています。

## 修正内容

### 1. [Components] DeviceSyncSettings.tsx
- [ ] `initializeDB` と `getLocalDb` を `../../services/localDB` からインポートするように修正。

### 2. [Services] imageSyncService.ts
- [ ] Firebase Storage から取得した URL (string) を `StorageUrl` にキャストするように修正。
- [ ] `createStorageUrl` を `../types/branded` からインポートして使用。

### 3. [Utils] imageUtils.ts
- [ ] `normalizeUploadedImage` 内で、`remoteUrl` および `thumbnailUrl` を `StorageUrl` にキャストするように修正。
- [ ] これにより、`normalizeCard` / `normalizeFolder` を経由して `SnapshotService.ts` で発生している型エラーも解消される見込み。

## 変更ファイル一覧
- [MODIFY] [DeviceSyncSettings.tsx](file:///c:/FlashcardMaster/src/Components/settings/DeviceSyncSettings.tsx)
- [MODIFY] [imageSyncService.ts](file:///c:/FlashcardMaster/src/services/imageSyncService.ts)
- [MODIFY] [imageUtils.ts](file:///c:/FlashcardMaster/src/utils/imageUtils.ts)

## 検証計画
### 自動テスト
- `npm run build` を実行し、TypeScript のコンパイルエラーが解消されたことを確認する。

### 手動確認
- 設定画面の「同期・ストレージ管理」タブが正常に表示されることを確認。
- 画像を含むカードの同期が正常に機能することを確認（既存機能への影響確認）。
