# Phase 2 運用ガイド (v2.1)

## 概要

Phase 2で実装・統合された新同期システム（SyncServiceV2）の運用手順書です。
V2.1 では、アプリ起動時の整合性確保と、ローカルDB操作時の自動エンキューが追加されています。

---

## 1. アーキテクチャ概要

### コンポーネント構成

```text
SyncServiceV2 (Orchestrator) - App.tsx の runStartupTasks で実行
├── QueueManager (永続化キュー)
├── NetworkMonitor (状態監視)
├── DiffEngine (差分計算) - server_wins 戦略
├── CloudSyncAdapter (Firestore I/O)
└── TelemetryService (ログ・メトリクス)
```

### 重要な統合ポイント

1. **自動エンキュー**: `LocalDB.ts` の `addItem`, `updateItem`, `softDelete` が呼ばれると、自動的に `syncQueue` にタスクが積まれ、同期がトリガーされます。
2. **起動時同期 (`performStartupSync`)**: ログイン完了後、UIが表示される前に「Pull -> Apply -> Push」の順で同期が実行されます。

---

## 2. 監視指標（SLI）

### System SLIs（技術指標）

| 指標 | 説明 | 正常範囲 | アラート閾値 |
| :--- | :--- | :--- | :--- |
| `sync_availability` | 同期の成功率 | > 95% | < 90% |
| `startup_sync_latency` | 起動時同期の完了時間 | < 5s | > 15s |
| `queue_depth` | 未処理キューの深さ | < 100 | > 500 |

---

## 3. トラブルシューティング

### 症状1: アプリ起動時に「同期中...」から進まない

**原因候補**:
- ネットワーク遮断
- クラウド上の大量の変更データの適用（初回同期等）
- Firestore 側のクォータ制限

**対処方法**:

1. リロードを試行（再開されます）。
2. `TelemetryService` で `startup_sync` トランザクションのエラーを確認。

### 症状2: 保存したはずのカードが他端末で反映されない

**原因候補**:
- ローカルDBでのエンキュー失敗（例外発生）
- `ENABLE_BACKGROUND_SYNC` フラグがオフになっている
- `skipSync` フラグの誤用

**対処方法**:

1. 開発者ツールの IndexedDB タブで `syncQueue` にタスクが残っていないか確認。
2. ネットワークモニターで `background` 同期がスキップされていないか確認。

---

## 4. リリース・管理

### ロールアウト状況

- **USE_SYNC_V2**: `true` (全ユーザー適用開始)
- **ENABLE_BACKGROUND_SYNC**: `true` (有効化済み)

### ロールバック手順
1. `src/features/flags.ts` で `USE_SYNC_V2` を `false` に戻してデプロイ。

---

**最終更新**: 2026-02-03  
**ドキュメント分類**: 運用手順書
