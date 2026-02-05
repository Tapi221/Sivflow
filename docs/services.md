# services — 主要サービス一覧とAPI要約

最終更新: 2026-02-05

このファイルは `src/services/` 配下の主要モジュールをまとめ、エクスポートされたクラス/関数の一覧と要約を自動抽出したものです。実装の詳細は各ソースファイルの該当行リンクを参照してください。

---

## SyncServiceV2
- ファイル: [src/services/SyncServiceV2.ts](src/services/SyncServiceV2.ts#L1)
- 概要: クライアント側の同期オーケストレーター。Pull→Apply→Push の制御、フルリシンク、競合検出と記録、Telemetry の計測を担います。
- 主なクラス/メソッド:
  - `class SyncServiceV2` — コンストラクタ: `(userId, localDB, queueManager, networkMonitor, diffEngine, cloudAdapter, telemetry)`
  - `synchronize(onProgress?) : Promise<SyncResult>` — レガシー互換の開始点
  - `sync(source) : Promise<void>` — 同期本体（重複実行防止、Pull/Push、最後の同期時刻更新）
  - `performStartupSync() : Promise<void>` — 起動時優先同期
  - `forceFullResync() : Promise<void>` — フル再同期（クラウドをマスターとしてローカルを再構築）
  - `applyRemoteChanges(changes) : Promise<void>` — 受信差分の適用ロジック
  - `removeDevice(deviceId) : Promise<void>` — 端末の論理削除（revoke）

注意:
- 大きな副作用を持つため呼び出しは Telemetry と NetworkMonitor を設定した上で行ってください。

---

## OperationQueue / OperationQueueService
- ファイル: [src/services/operationQueue.ts](src/services/operationQueue.ts#L1)
- 概要: ローカル発生の CRUD 操作を圧縮・キューイングし、優先度・再試行・DLQ の方針で安全にサーバへ送信します。
- 主な API:
  - `enqueueChange(entity, targetId, operationType, data, priority?)` — 操作の追加（圧縮ルール適用）
  - `processQueue() : Promise<void>` — キューの処理エンジン（並列・優先度・ロック制御）
  - 内部: `handleFailure`, `moveToDLQ`, `resolvePriority` などリトライと障害対策ロジック

注意:
- キューの仕様（Delete on Success）があるため、失敗時の復旧手順を `localDB.syncErrors` を確認して実行してください。

---

## LocalDB (Dexie)
- ファイル: [src/services/localDB.ts](src/services/localDB.ts#L1)
- 概要: IndexedDB（Dexie）層。スキーマ定義、データの正規化/非正規化、マイグレーション・インポート・フォレンジック用ユーティリティが含まれます。
- 主なクラス/メソッド:
  - `class LocalDB extends Dexie` — テーブル: `folders`, `cards`, `syncQueue`, `syncErrors`, `cardRelations`, `projectMaps`, 等
  - `static listDatabases(): Promise<IDBDatabaseInfo[]>` — ブラウザ内 DB 列挙
  - `static fullOriginForensicAudit(onProgress?)` — 全オリジンスキャン（ログ出力）
  - `importFromDatabase(sourceDbName, currentUserId, onProgress?)` — 別 DB からのデータ救出
  - `transaction(mode, tables, fn)` — Dexie のトランザクション利用

注意:
- スキーマ変更時は必ず `version` とマイグレーション関数を追加し、既存データの後方互換を検証してください。

---

## SnapshotService
- ファイル: [src/services/SnapshotService.ts](src/services/SnapshotService.ts#L1)
- 概要: ローカルデータの完全スナップショット作成、ファイルエクスポート、Firestore 保存、比較機能を提供します。
- 主なメソッド:
  - `createSnapshot(userId) : Promise<AppSnapshot>`
  - `exportToFile(userId, folderName?) : Promise<void>`
  - `exportFolder(userId, folderId) : Promise<void>`
  - `parseSnapshotFile(file) : Promise<AppSnapshot>`
  - `compareWithLocal(imported, userId) : Promise<SnapshotComparison>`
  - `saveToFirestore(snapshot) : Promise<void>`

注意:
- エクスポート前に世代カウンターをインクリメントします。スナップショットは最大世代数でローテーションされます。

---

## reviewAlgorithm
- ファイル: [src/services/reviewAlgorithm.ts](src/services/reviewAlgorithm.ts#L1)
- 概要: 復習アルゴリズムの実装。与えられた `subjectiveScore` に基づき `memoryStability` を更新し、次回レビュー日を算出します。
- 主な関数:
  - `computeNextReview({card, subjectiveScore, now?, delayBonusEnabled?}) : ReviewAlgorithmResult`
  - `calculateRecallProbability(stability, daysSinceReview) : number`
  - `getInitialStability(memoryStability?, legacyLevel?)`

実装ノート:
- 安定性 (stability) を 0.0–1.0 のスケールで扱い、間隔計算は `1 + 100 × S^2.5` の式を使用しています。

---

## telemetry / ProductionLogger
- ファイル: [src/services/ProductionLogger.ts](src/services/ProductionLogger.ts#L1)
- 概要: テレメトリの収集、トランザクション計測、エラーロギングを扱う。SyncService 等でトランザクションを開始して計測します。

---

## 補足・推奨ワークフロー
- `src/services/` の変更は小さく分割し、ユニットテスト (`src/services/__tests__`) と `localDB` のマイグレーション計画を同時に作成してください。
- ドキュメント自動生成: 次の作業で API シグネチャを自動抽出し `docs/services.md` を更に充実させることを推奨します。

---

## 自動抽出: エクスポート一覧
以下は `src/services/` をスキャンして抽出した主な `export` シンボルです（ファイル名と最初の定義行を併記）。必要であれば各シンボルの詳細シグネチャをさらに展開します。

- [src/services/cloudProvider.ts](src/services/cloudProvider.ts#L1)
  - `export interface ICloudProvider` — クラウド同期抽象
  - `export class FirebaseCloudProvider` — Firebase 実装

- [src/services/StorageMonitor.ts](src/services/StorageMonitor.ts#L1)
  - `export interface StorageQuota`
  - `export const storageMonitor` — インスタンス

- [src/services/SyncServiceV2.ts](src/services/SyncServiceV2.ts#L1)
  - `export class SyncServiceV2` — 同期オーケストレーター

- [src/services/SyncServiceFactory.ts](src/services/SyncServiceFactory.ts#L1)
  - `export class SyncServiceFactory` — Feature flag に基づく生成

- [src/services/syncService.ts](src/services/syncService.ts#L38)
  - `export class SyncService` — レガシー互換実装

- [src/services/StorageStateManager.ts](src/services/StorageStateManager.ts#L1)
  - `export class StorageStateManager`

- [src/services/statsService.ts](src/services/statsService.ts#L1)
  - `export async function updateStats(data: StatsUpdateData): Promise<StatsUpdateResult>`
  - `export async function recordLogin(): Promise<{ success: boolean; consecutiveDays?: number }>`

- [src/services/SnapshotService.ts](src/services/SnapshotService.ts#L1)
  - `export const snapshotService` (default export)

- [src/services/SafeIndexedDBWriter.ts](src/services/SafeIndexedDBWriter.ts#L1)
  - `export class SafeIndexedDBWriter`

- [src/services/queueIntegration.ts](src/services/queueIntegration.ts#L1)
  - `export class QueueIntegrationService`
  - `export function getQueueIntegration(userId: string): QueueIntegrationService`

- [src/services/reviewAlgorithm.ts](src/services/reviewAlgorithm.ts#L1)
  - `export type ReviewAlgorithmInput`
  - `export type ReviewAlgorithmResult`
  - `export const getInitialStability`
  - `export const computeNextReview`
  - `export const calculateRecallProbability`

---

必要であれば、上記シンボルそれぞれの完全な TypeScript シグネチャ（引数型・戻り値型・説明）を自動抽出して追記します。実行しますか？
