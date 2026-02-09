# 初期化関連エラー（ReferenceError: Cannot access 'L' before initialization）の修正計画 (Rev.2)

## 概要
`LocalDB` をシングルトンパターンに変更した際、以下の問題が重なり `ReferenceError` が発生しています。
1. **循環参照**: `localDB.ts` が `utils` を経由して、あるいは他サービスを経由して、自身が完全に初期化される前に `getLocalDb()` が呼ばれている。
2. **インポートパスの不一致**: `LocalDB` (大文字L) と `localDB` (小文字l) が混在しており、Windows環境や特定のビルド設定で二重ロードや解決順序の混乱を招いている。
3. **廃止されたシングルトンへの依存**: `DataIntegrityService` などが、リファクタリングで削除された `export const localDb` を参照しようとしている。

本計画では、これらを一挙に修正し、データベースアクセスを `await getLocalDb()` に完全に一元化します。

## ユーザーレビューが必要な項目
> [!IMPORTANT]
> データベースアクセスのすべてが非同期 (`await getLocalDb()`) に統一されます。これにより、モジュールロード時の副作用が排除され、安全な初期化が保証されます。

## 変更内容

### 1. インポートパスの統一と命名規則の整理
ファイル名 `localDB.ts` に合わせ、プロジェクト全体のインポートパスを `./localDB` または `../services/localDB` に統一します。

#### [MODIFY] 以下のファイルにおける `from '.*LocalDB'` の置換
- `src/hooks/useCards.ts`
- `src/services/AppInitializer.ts`
- `src/services/SyncServiceFactory.ts`
- `src/services/operationQueue.ts`
- `src/services/IndexedDBRebuildOrchestrator.ts`
- `src/services/SnapshotService.ts`
- `src/services/HistoryCompressionService.ts`
- `src/services/ImageSyncOrchestrator.ts`
- `src/Components/settings/DataRescuePanel.tsx`

### 2. 廃止された `localDb` シングルトン参照の修正
`import { localDb }` を `import { getLocalDb }` に置き換え、メソッド内で `await getLocalDb()` を取得するように変更します。

#### [MODIFY] [DataIntegrityService.ts](file:///c:/FlashcardMaster/src/services/DataIntegrityService.ts)
- `import { localDb } from './localDB'` -> `import { getLocalDb } from './localDB'`
- 各メソッド内で `const db = await getLocalDb();` を通じて操作を実行。

### 3. 初期化タイミングの安全化
`localDB.ts` 自体のモジュール評価時に `LocalDB` クラスが確実に定義されていることを保証し、外部サービス（特に関数としてエクスポートされているシングルトン）がロード時に `db` を叩かないようにします。

## 検証計画

### 自動テスト
- `npm run build` を実行し、型チェックおよびビルドが正常に完了することを確認します。これによりインポートパスの間違いが検出されます。

### 手動検証
1. ブラウザを起動し、コンソールに `ReferenceError` が出ないことを確認。
2. ログイン後、ダッシュボードにカードが表示されることを確認。
3. カードの作成・編集を実行し、DB操作が正常に行われることを確認。
4. 設定画面の「データ診断」などを実行し、`DataIntegrityService` が正常に動作することを確認。
