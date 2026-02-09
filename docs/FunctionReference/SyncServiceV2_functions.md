# SyncServiceV2 - 関数リファレンス

最終更新: 2026-02-05

概要: `src/services/SyncServiceV2.ts` に実装された `SyncServiceV2` クラスの公開メソッドおよび主要な内部メソッドの一覧と簡潔な説明です。

各エントリは関数名 → シグネチャ → 概要 → パラメータ → 返り値 の順で記載しています。

---

## constructor(userId, localDB, queueManager, networkMonitor, diffEngine, cloudAdapter, telemetry)

- 概要: 各種依存コンポーネントを注入してインスタンスを初期化します。`SecurityMonitor` の初期化と `LocalDB` の同期トリガ登録も行います。
- 引数: `userId: string`, `localDB: LocalDB`, `queueManager: IQueueManager`, `networkMonitor: INetworkMonitor`, `diffEngine: IDiffEngine`, `cloudAdapter: ICloudSyncAdapter`, `telemetry: TelemetryService`
- 返り値: なし（クラスインスタンス）

## async synchronize(onProgress?: (msg: string) => void): `Promise&lt;SyncResult&gt;`

- 概要: レガシー互換の同期エントリ。内部で `sync('user_initiated')` を呼び、結果を `SyncResult` 型で返します。
- 引数: `onProgress?: (msg: string) => void`（オプション）
- 返り値: `Promise&lt;SyncResult&gt;` - 成否、アップロード数／ダウンロード数、競合・エラー情報を含む。

## async sync(source: SyncContextSource): `Promise&lt;void&gt;`

- 概要: 同期ワークフローの主要エントリ。デバイスステータスチェック、pull (cloud -> local)、push (local -> cloud)、メタデータ更新を順に実行します。二重実行防止機構と telemetry トランザクションを備えます。
- 引数: `source: SyncContextSource`（'background' / 'user_initiated' / 'force_resync' 等）
- 返り値: `Promise&lt;void&gt;`
- 注意: ネットワーク状態が `offline`/`poor` の場合は早期リターンします。

## private async processBatch(tasks: SyncTask[]): `Promise&lt;void&gt;`

- 概要: キューから取得した同期タスク群を逐次実行します。各タスクは upload/download に分岐され、`cloudAdapter` を介して処理されます。成功/失敗の集計後に `queueManager` に結果を反映します。
- 引数: `tasks: SyncTask[]`
- 返り値: `Promise&lt;void&gt;`
- 注意: 致命的競合が発生した場合は `forceFullResync()` を呼び、自己修復を試みます。

## async performStartupSync(): `Promise&lt;void&gt;`

- 概要: アプリ起動時に優先して実行する同期。Pull を優先し、続けてローカルの待機タスクを Push します。成功時に最終同期時刻を更新します。
- 引数: なし
- 返り値: `Promise&lt;void&gt;`

## private async applyRemoteChanges(changes: any[]): `Promise&lt;void&gt;`

- 概要: クラウドから受け取った変更群をローカルDBに適用します。フォルダの循環参照検出やマージ（`diffEngine.merge`）・競合記録処理を含みます。
- 引数: `changes: any[]`（各 change は { type, id, data } 構造を想定）
- 返り値: `Promise&lt;void&gt;`

## async getQueueStatus(): `Promise&lt;{ pending: number; isSyncing: boolean }&gt;`

- 概要: キュー深度（保留件数）と現在の同期状態を返します。
- 引数: なし
- 返り値: `Promise&lt;{ pending: number; isSyncing: boolean }&gt;`

## async forceFullResync(): `Promise&lt;void&gt;`

- 概要: トラブルシューティング用の強制フル同期を実行します。クラウドをソースにローカルを再構築し、同期メタデータを更新します。セキュリティイベント記録とフォールバックカウントのインクリメントを行います。
- 引数: なし
- 返り値: `Promise&lt;void&gt;`

## async removeDevice(deviceId: string): `Promise&lt;void&gt;`

- 概要: 指定デバイスを論理的に無効化（`status: 'revoked'`）します。Firestore の該当ドキュメントを更新し、監査イベントを記録します。
- 引数: `deviceId: string`
- 返り値: `Promise&lt;void&gt;`

## private async checkDeviceStatus(): `Promise&lt;void&gt;`

- 概要: 現在のクライアントデバイスが `revoked` になっていないかを確認します。revoked ならば例外を投げて同期を中断します。
- 引数: なし
- 返り値: `Promise&lt;void&gt;`

## async updateDeviceName(deviceId: string, newName: string): `Promise&lt;void&gt;`

- 概要: デバイス名を更新するユーティリティ。Firestore 上のデバイスドキュメントを更新します。
- 引数: `deviceId: string`, `newName: string`
- 返り値: `Promise&lt;void&gt;`

## async cleanupInactiveDevices(): `Promise&lt;number&gt;`

- 概要: 一定期間（24時間より古い）同期を行っていないデバイスをクリーンアップ（物理削除）します。ただし `revoked` 状態のデバイスは除外します。
- 引数: なし
- 返り値: `Promise&lt;number&gt;` - 削除したデバイス数

## async getSyncStats(): `Promise&lt;any&gt;`

- 概要: レガシー互換のダミー統計取得メソッド。将来的に telemetry からの集計を返す想定。
- 引数: なし
- 返り値: `Promise&lt;any&gt;`

## async getUnresolvedConflicts(): `Promise&lt;any[]&gt;`

- 概要: 未解決の競合一覧を返す（現状ダミーで空配列を返す）。
- 引数: なし
- 返り値: `Promise&lt;any[]&gt;`

## async loadSettings(): `Promise&lt;any&gt;`

- 概要: 設定読み込み（互換性用のダミー実装）。
- 引数: なし
- 返り値: `Promise&lt;any&gt;`

## async performFullSync(): `Promise&lt;void&gt;`

- 概要: フル同期をトリガーするラッパー。内部で `sync('force_resync')` を呼びます。
- 引数: なし
- 返り値: `Promise&lt;void&gt;`

## async processQueue(): `Promise&lt;{ processed: number; errors: any[] }&gt;`

- 概要: キュー処理を実行するラッパー。内部で `sync('background')` を呼びます。
- 引数: なし
- 返り値: `Promise&lt;{ processed: number; errors: any[] }&gt;`

## monitorSecurity(callback): () => void

- シグネチャ: `monitorSecurity(callback: (state: { isLocked: boolean; requires2FA: boolean; alerts: any[] }) => void): () => void`
- 概要: `SecurityMonitor` を通じてクライアント側のセキュリティ状態監視を開始します。戻り値は購読解除関数です。

## async dismissSecurityAlert(alertId: string): `Promise&lt;void&gt;`

- 概要: 指定のセキュリティアラートを既読（dismiss）にします。`SecurityMonitor` に委譲されます。
- 引数: `alertId: string`
- 返り値: `Promise&lt;void&gt;`

---

Notes:

- 本ドキュメントは `SyncServiceV2` のソース（`src/services/SyncServiceV2.ts`）に基づき作成しています。実装詳細や追加の内部ユーティリティはソース側のコメントや `I*` インターフェース定義を参照してください。
