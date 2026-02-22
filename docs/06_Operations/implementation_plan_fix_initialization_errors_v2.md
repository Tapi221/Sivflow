# IDEエラーの解消実装計画

## 背景・目的
IDEで報告されている複数の型エラー、モジュール未発見エラー、および Lucide アイコンの未発見エラーを解消し、プロジェクトのビルド安定性を向上させます。

## 現状の課題
1.  **RecentPanel.tsx**: `Card` および `DocumentItem` 型に `cardId` / `documentId` プロパティが存在しないためエラー。
2.  **ContextMenu.tsx / AccountLockedScreen.tsx**: `lucide-react` から `Star` および `ShieldAlert` がエクスポートされていないと判定される。
3.  **CardRow.tsx / FolderRow.tsx**: `@hello-pangea/dnd` が見つからない。
4.  **RightPane.tsx**: `DocumentItem` と `PdfPaneDoc` (PdfPane.tsx 内) の型に不整合があり、`uploadStatus` の列挙型不足と `blobUrl` の Branded Type 不一致により代入エラー。
5.  **SlideImage.tsx**: `firebase/storage` が見つからない。

## 変更内容

### [Component] [Types]
#### [MODIFY] [src/types/index.ts](file:///c:/FlashcardMaster/src/types/index.ts)
- `Card` 型に `cardId?: string;` を追加（`Folder` の `folderId` と同様の互換用）。
- `DocumentItem` 型に `documentId?: string;` を追加（同上）。

### [Component] [PDF Viewer]
#### [MODIFY] [src/Components/pdf/PdfPane.tsx](file:///c:/FlashcardMaster/src/Components/pdf/PdfPane.tsx)
- `PdfPaneDoc` インターフェースを `DocumentItem` と整合させる。
  - `uploadStatus` に `'queued'` を追加。
  - `blobUrl` を `string | null` から `BlobUrl | null` に変更（`src/types/branded.ts` からインポート）。
  - `localUrl` を `BlobUrl | null` に変更。

### [Component] [Explorer / UI]
#### [MODIFY] [src/Components/folder/ContextMenu.tsx](file:///c:/FlashcardMaster/src/Components/folder/ContextMenu.tsx)
- `lucide-react` のインポートを確認・修正。必要に応じてアイコン名を検証（`Star` は標準的なはずだが、環境エラーの場合はエイリアス検討）。

#### [MODIFY] [src/Components/security/AccountLockedScreen.tsx](file:///c:/FlashcardMaster/src/Components/security/AccountLockedScreen.tsx)
- `ShieldAlert` が見つからない場合、`ShieldAlert` 以外の類似アイコン（`ShieldX` など）への変更、または `lucide-react` のバージョンに合わせたインポート修正。

### [Component] [PPTX / Slide]
#### [MODIFY] [src/Components/pptx/SlideImage.tsx](file:///c:/FlashcardMaster/src/Components/pptx/SlideImage.tsx)
- `firebase/storage` のインポートエラーを解消。

## 検証計画

### 自動テスト
- `npm run typecheck` を実行し、今回修正した箇所のエラーが解消されていることを確認。

### 手動確認
1.  **RecentPanel**: 「最近開いたアイテム」にカードやドキュメントが正しく表示され、エラーが出ないことを確認。
2.  **PDF表示**: PDFを開いた際に `RightPane.tsx` 経由での Props 渡しで型エラーが発生していない（かつ動作が正常）ことを確認。
3.  **アイコン表示**: お気に入り（Star）やアカウントロック画面（ShieldAlert）のアイコンが正しく表示されることを確認。
