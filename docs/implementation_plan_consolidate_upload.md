# ファイルアップロード処理の集約化に伴う修正 (`useFolderDocumentUpload.ts`)

## 目的
ファイルアップロード処理の整理（PDF/PPTXボタンを単一の「ドキュメント追加」に統合する等）に対応するため、`useFolderDocumentUpload` フックを修正しました。

## 修正内容
以下の通り、指定されたパッチを適用しました。

### 1. インターフェースの変更
- `handleToolbarAddFile` を `handleToolbarAddDocument` に名称変更しました。
- 旧来の `handleToolbarAddPdf` や `handleToolbarAddPptx` が残っていた場合はそれらも削除し、汎用的なドキュメント追加処理に集約しました。

### 2. 初期状態の変更
- `currentFileAccept` のデフォルト値を PDF と PPTX 両方を受け入れる形式に変更しました。
- `uploadTypeRef` のデフォルト値を `"all"` に変更しました。

### 3. `handleToolbarAddDocument` の実装
- ツールバーのアクションとして呼び出された際、`uploadTypeRef` を `"all"` に設定し、`currentFileAccept` を統合したファイル拡張子/MIMEタイプに更新するようにしました。

### 4. `handleToolbarFileInputChange` の整理
- 選択されたファイルの種別（PDF/PPTX）を自動判別してそれぞれ対応する処理に回すようにし、処理完了後に `uploadTypeRef` などをリセットする処理を追加しました。
- どのファイルも選択されなかった場合の警告メッセージを `uploadType` に応じて出し分けるようにしました。

## 完了確認
- TypeScript コンパイル (`npx tsc --noEmit`) が Exit code: 0 で完了し、プロジェクト全体で型エラーがないことを確認しました。
-  कंसोलिडेशन作業（`FolderTreeWithCards.tsx` 等のUI側の修正と合わせた対応）が完了していることを確認しました。
