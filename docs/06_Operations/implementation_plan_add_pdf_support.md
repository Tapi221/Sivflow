# PDFドキュメント用テーブル `documents` の追加計画

## 概要

PDFドキュメントを管理するための `documents` テーブルを LocalDB に追加し、関連する型定義とサービスクラスを更新します。

## 要求事項

- `src/types/index.ts` に `Document` および `PdfDocument` 型をエクスポートする。
- `src/services/localDB.ts` で `documents` テーブルを `Dexie.Table<Document, string>` として定義する（方針A）。
- `LocalDB` クラスのスキーマバージョン17に `documents` 定義を確認・追加する。
- `clearAllData()` に `documents` テーブルのクリア処理を追加する。
- `localDB.ts` 内の typo (`sareRead`)、スコープエラー、プロパティ重複 (`tags`) を修正する。

## 変更内容

### 1. 型定義の更新 (`src/types/index.ts`)

- `Document` 型のエイリアスとして `PdfDocument` を追加エクスポートします。

```typescript
export type Document = DocumentItem;     // 既存
export type PdfDocument = DocumentItem;  // 追加
```

### 2. LocalDB サービスの更新 (`src/services/localDB.ts`)

- **Import 修正**: `Document` をインポートし、利用するように統一します。
- **プロパティ定義**:
  ```typescript
  documents!: Dexie.Table<Document, string>;
  ```
- **スキーマ定義**: `version(17)` に `documents` が含まれていることを確認します（現状確認済み）。
- **データクリア**: `clearAllData` に `this.documents.clear()` を追加。
- **修正**:
  - `sareRead` -> `safeRead`
  - `tags` プロパティの重複定義を削除。
  - `importFromDatabase` 内の document 読み込み部分の調整。

## 検証計画

### 静的解析
- `pnpm typecheck` (または IDE の型チェック) を実行し、エラーがないことを確認します。

### 動作確認
- アプリケーションを起動し、コンソールで `dbDebug()` などを実行して `documents` テーブルが存在することを確認します。
- ブラウザのDevTools > Application > IndexedDB で `FlashcardMasterDB_{uid}` > `documents` テーブルが存在することを確認します。
