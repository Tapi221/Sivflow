# データベース再構築フローの修正とユーティリティ関数の適正化

## 目的
アプリ起動時の初期化および再構築プロセスで発生している `DatabaseClosedError` を解消し、データの整合性を回復します。また、ビルド済み環境で発生している `cn is not defined` エラーの原因を取り除きます。

## 根本原因の分析

### 1. DatabaseClosedError
`AppInitializer.rebuild` メソッド内において、`db.delete()` を実行してデータベースを破棄した後、新しいデータベース接続を確立（`initializeDB` の呼び出し）せずに `IndexedDBRebuildOrchestrator.rebuild` を呼び出しています。このため、後続の処理で閉じられたデータベースインスタンス（`localDb`）へのアクセスが発生し、エラーとなります。

### 2. cn is not defined
`OneQAMode.jsx` において、`cn` を `clsxMerge` という別名でインポートしていますが、プロジェクト全体では `cn` としての利用が標準的です。ビルド環境でのエラーは、特定のコンポーネントでのパス解決の失敗や、インポートの不整合に起因している可能性があります。

### 3. データ整合性問題 (count_mismatch)
再構築処理が途中で失敗（上記エラーが原因）したため、実データとメタデータの乖離が発生しています。再構築フローを正常化することで自動的に解決されます。

## 変更内容

### [1] データベース初期化
#### [MODIFY] [AppInitializer.ts](file:///c:/FlashcardMaster/src/services/AppInitializer.ts)
- `rebuild` メソッド内で `db.delete()` を `await` した後、`initializeDB(userId)` を再度呼び出し、新しい DB 接続を `localDb` 変数にセットするように修正します。

### [2] UI ユーティリティ
#### [MODIFY] [OneQAMode.jsx](file:///c:/FlashcardMaster/src/Pages/OneQAMode.jsx)
- `cn as clsxMerge` という別名インポートをやめ、他のコンポーネントと同様に `cn` としてインポート・使用するように統一します。これによりビルド時のシンボル解決の不確実性を排除します。

## 影響範囲
- アプリ起動時の初期化フロー（既存データへの影響はありません。再構築が必要なケースでのみ走ります）。
- 一問一答モード（UI 表示の安定化）。

## 検証計画

### 自動テスト
- 現状、IndexedDB のモックを含むテストが不十分なため、ユニットテストの追加を検討しますが、まずは手動検証を優先します。

### 手動検証
1. **DatabaseClosedError の再現と修正確認**
   - ブラウザのコンソールから `dbInstance.metadata.put({key: 'main', storageState: 'DIRTY'})` を実行し、リロードして強制的に再構築をトリガーする。
   - `AppInitializer` が Phase 2 に入り、再構築が成功して `CLEAN` にマークされることを確認する。
2. **cn エラーの確認**
   - 修正後の `OneQAMode` 画面を開き、レンダリングエラーなしに正しく表示されることを確認する。
