# デプロイ後エラー緊急修正計画 (DatabaseClosedError, cn is not defined, count_mismatch)

## 概要
デプロイ後に報告された以下の3つのクリティカルな不具合を修正する。

1.  **DatabaseClosedError**: リビルド処理中にデータベースが閉じられ、その後の操作でエラーが発生する。
2.  **ReferenceError: cn is not defined**: `CardEditor` コンポーネントで `cn` ユーティリティ関数が見つからない。
3.  **count_mismatch**: アプリ起動時のヘルスチェックで、メタデータの期待値と実際のレコード数が一致しない。

## 原因と対策

### 1. DatabaseClosedError
*   **原因**: `IndexedDBRebuildOrchestrator` でのリビルド時、既存のDBインスタンスが正しく破棄・再作成されていない、あるいは破棄されたインスタンスを使い続けている。Dexieのインスタンス管理が不十分。
*   **対策**:
    *   `src/services/localDB.ts`: `LocalDB` クラスに `clearInstance()` スタティックメソッドを追加し、シングルトンインスタンスを明示的に破棄・null化できるようにする。
    *   `src/services/IndexedDBRebuildOrchestrator.ts`: リビルドロジックを刷新。
        1.  既存DBのクローズ (`oldDb.close()`)
        2.  物理データベースの削除 (`Dexie.delete()`)
        3.  インスタンスキャッシュのクリア (`LocalDB.clearInstance()`)
        4.  新規インスタンス作成と再同期

### 2. ReferenceError: cn is not defined (@ CardEditor)
*   **原因**: バンドリングの問題か、特定の環境下でのインポート解決失敗。
*   **対策**: 確実性を高めるため、以下のいずれか（または両方）を実施。
    *   `@/lib/utils` からのインポートを相対パスに変更してみる。
    *   `lib/utils.ts` が副作用なく読み込まれるように確認。
    *   **暫定回避策**: `cn` 関数を `CardEditor.tsx` 内（またはその近く）で再定義するか、`clsx`, `tailwind-merge` を直接インポートしてローカルで `cn` を定義し、外部依存を断つ。今回は安全のためにローカル定義（または別名でのユーティリティファイル作成）を検討するが、まずは既存の `import` が正しくバンドルされる修正を試みる。

### 3. count_mismatch (Health Check)
*   **原因**: メタデータ (`syncMetadata` や `metadata` テーブル) に保存されたレコード数と、実際のテーブルのレコード数がずれている。
*   **対策**: ヘルスチェック時にカウント不一致が発生した場合、単にエラーを出すのではなく、メタデータを実数に合わせて補正する（自己修復）、あるいは許容範囲内であれば無視するロジックを追加する。

## 修正対象ファイル

### [MODIFY] src/services/localDB.ts
*   `static clearInstance()` メソッドの追加。
*   インスタンス管理ロジックの強化。

### [MODIFY] src/services/IndexedDBRebuildOrchestrator.ts
*   `rebuild` メソッドのロジック変更（Delete & Recreate パターンへ）。

### [MODIFY] src/Components/card/CardEditor.tsx
*   `cn` のインポート修正、またはローカル実装への切り替え。

### [MODIFY] src/services/IndexedDBMetadataService.ts
*   ヘルスチェック（`checkHealth`相当のメソッド）のロジック修正。

## 検証計画

### 自動テスト
*   既存のテストがあれば実行。なければビルド (`npm run build`) を通して静的なエラーがないか確認。

### 手動検証手順
1.  **ビルド検証**: `npm run build` がエラーなく完了すること。
2.  **リビルド動作確認** (DevTools Console):
    *   `await (await import('./src/services/IndexedDBRebuildOrchestrator')).IndexedDBRebuildOrchestrator.rebuild('USER_ID')` などを実行し、エラーなく完了するか確認（難易度高）。
    *   または、アプリ上でリビルドが走る操作（詳細設定からのキャッシュクリアなど）を行う。
3.  **動作確認**:
    *   カード編集画面を開き、デザインが崩れていないか（`cn` が効いているか）確認。
    *   コンソールに `ReferenceError: cn is not defined` が出ないことを確認。

## 実行手順
1.  `localDB.ts` に `clearInstance` を実装。
2.  `IndexedDBRebuildOrchestrator.ts` を修正。
3.  `CardEditor.tsx` の `cn` 問題に対処。
4.  ヘルスチェックロジックを修正。
5.  ビルド確認。
