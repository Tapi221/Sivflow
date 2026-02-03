# Phase 1 競合制御システム 運用ガイド

## 1. デプロイ手順

### 1.1 前提条件

#### 必要なツール
```bash
# Node.js & npm
node --version  # v18以上推奨
npm --version   # v9以上推奨

# Firebase CLI
npm install -g firebase-tools
firebase --version  # v13以上

# Google Cloud SDK
gcloud --version
```

#### プロジェクト設定確認
```bash
# Firebaseプロジェクト確認
firebase projects:list

# アクティブプロジェクト設定
firebase use <project-id>

# Google Cloudプロジェクト確認
gcloud config get-value project
```

---

### 1.2 Cloud Functions デプロイ

#### Step 1: ビルド

```bash
cd functions
npm install
npm run build
```

#### Step 2: テスト実行（オプション）

```bash
npm test
```

#### Step 3: デプロイ

```bash
# すべてのFunctionsをデプロイ
firebase deploy --only functions

# 特定のFunctionのみデプロイ
firebase deploy --only functions:getGlobalSequence
firebase deploy --only functions:executeIdempotentOperation
firebase deploy --only functions:scheduledStatsUpdate
```

#### デプロイ設定（firebase.json）

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18",
    "predeploy": "npm --prefix \"$RESOURCE_DIR\" run build"
  }
}
```

---

### 1.3 Cloud Scheduler 設定

#### スケジューラジョブの作成

```bash
# 統計更新ジョブ（毎分実行）
gcloud scheduler jobs create pubsub stats-update-trigger \
  --location=asia-northeast1 \
  --schedule="* * * * *" \
  --topic=stats-trigger \
  --message-body='{"action":"updateStats"}' \
  --time-zone="Asia/Tokyo" \
  --description="Update user statistics every minute"
```

#### ジョブの確認

```bash
# ジョブ一覧
gcloud scheduler jobs list --location=asia-northeast1

# ジョブ詳細
gcloud scheduler jobs describe stats-update-trigger \
  --location=asia-northeast1
```

#### 手動実行（テスト用）

```bash
gcloud scheduler jobs run stats-update-trigger \
  --location=asia-northeast1
```

---

### 1.4 Firestore インデックス設定

#### 必要なインデックス

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "operations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "clientSeq", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "operations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "ttl", "order": "ASCENDING" }
      ]
    }
  ]
}
```

#### インデックスデプロイ

```bash
firebase deploy --only firestore:indexes
```

---

### 1.5 セキュリティルール設定

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Idempotency Cache (Cloud Functions専用)
    match /idempotency_cache/{userId}/operations/{operationId} {
      allow read, write: if false; // クライアント直接アクセス不可
    }
    
    // Global Sequence Shards (Cloud Functions専用)
    match /_system/sequences/shards/{shardId} {
      allow read, write: if false;
    }
    
    // User Stats (読み取り専用)
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Cloud Functions経由のみ
    }
  }
}
```

```bash
firebase deploy --only firestore:rules
```

---

## 2. モニタリング

### 2.1 Cloud Functions メトリクス

#### Firebase Console

```
https://console.firebase.google.com/project/<project-id>/functions
```

- **実行回数**: `functions/count`
- **実行時間**: `functions/execution_time`
- **エラー率**: `functions/error_count`

#### Cloud Monitoring ダッシュボード

```bash
# カスタムダッシュボード作成
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

**dashboard.json**:
```json
{
  "displayName": "Phase 1 Concurrency Control",
  "gridLayout": {
    "widgets": [
      {
        "title": "Global Sequence Requests",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"cloud_function\" AND resource.labels.function_name=\"getGlobalSequence\""
              }
            }
          }]
        }
      },
      {
        "title": "Idempotency Cache Hit Rate",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "metric.type=\"custom.googleapis.com/idempotency_cache_hit_rate\""
            }
          }
        }
      }
    ]
  }
}
```

---

### 2.2 アラート設定

#### ResyncRequired頻発アラート

```bash
gcloud alpha monitoring policies create \
  --notification-channels=<channel-id> \
  --display-name="High ResyncRequired Rate" \
  --condition-name="resync-rate-high" \
  --condition-threshold-value=50 \
  --condition-threshold-duration=60s \
  --condition-filter='metric.type="custom.googleapis.com/resync_required_count" AND resource.type="cloud_function"'
```

#### Cloud Function エラー率アラート

```bash
gcloud alpha monitoring policies create \
  --notification-channels=<channel-id> \
  --display-name="Function Error Rate High" \
  --condition-name="function-error-high" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --condition-filter='metric.type="cloudfunctions.googleapis.com/function/execution_count" AND metric.label.status!="ok"'
```

---

### 2.3 ログ確認

#### Cloud Logging

```bash
# 最新50件のログ
gcloud logging read "resource.type=cloud_function" \
  --limit 50 \
  --format json

# 特定のFunctionのログ
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=executeIdempotentOperation" \
  --limit 20

# エラーログのみ
gcloud logging read "severity>=ERROR AND resource.type=cloud_function" \
  --limit 10
```

#### カスタムログクエリ

```sql
-- ResyncRequiredエラーを集計
resource.type="cloud_function"
jsonPayload.error.code="RESYNC_REQUIRED"
timestamp >= "2026-01-31T00:00:00Z"
```

---

## 3. トラブルシューティング

### 3.1 ResyncRequired多発

#### 症状
```
Error: RESYNC_REQUIRED - Client sequence out of order
Expected: 42, Received: 50
```

#### 原因
1. クライアント側の`clientSeq`同期不良
2. オフライン期間中の操作が多すぎる
3. LocalStorageクリアによる`clientSeq`リセット

#### 対策

1. **クライアント側ログ確認**
   ```javascript
   // ブラウザコンソール
   localStorage.getItem('_client_seq');
   localStorage.getItem('_operation_queue');
   ```

2. **手動リセット（ユーザー指示）**
   ```javascript
   // ユーザーに以下を実行してもらう
   localStorage.clear();
   window.location.reload();
   ```

3. **サーバー側でユーザー状態リセット** (緊急時のみ)
   ```bash
   # Admin SDKスクリプト
   firebase functions:shell
   > await resetUserSequenceState('user_abc123');
   ```

---

### 3.2 Idempotency Cache肥大化

#### 症状
```
Firestore quota exceeded: Too many documents in collection
```

#### 原因
- TTL期限切れドキュメントの未削除
- 高頻度操作によるキャッシュ蓄積

#### 対策

1. **TTL自動削除の確認**
   ```bash
   # Firestore TTLポリシー確認
   gcloud firestore fields ttls list \
     --database=(default)
   ```

2. **手動クリーンアップ**
   ```typescript
   // functions/src/scripts/cleanupCache.ts
   export async function cleanupExpiredCache(): Promise<void> {
     const now = Timestamp.now();
     const expired = await firestore
       .collectionGroup('operations')
       .where('ttl', '<', now)
       .limit(500)
       .get();
     
     const batch = firestore.batch();
     expired.docs.forEach(doc => batch.delete(doc.ref));
     await batch.commit();
     
     console.log(`Cleaned up ${expired.size} expired records`);
   }
   ```

3. **Cronジョブで定期削除**
   ```bash
   gcloud scheduler jobs create pubsub cache-cleanup \
     --schedule="0 */6 * * *" \
     --topic=cleanup-trigger \
     --time-zone="Asia/Tokyo"
   ```

---

### 3.3 Global Sequence競合多発

#### 症状
```
Error: UNAVAILABLE - Failed to acquire sequence after 3 retries
Shard: 3, Retry count: 3
```

#### 原因
- 特定シャードへのアクセス集中
- Transaction競合によるリトライ失敗

#### 対策

1. **シャード負荷確認**
   ```typescript
   // 各シャードの使用状況確認
   for (let i = 0; i < 10; i++) {
     const shard = await firestore
       .collection('_system/sequences/shards')
       .doc(String(i))
       .get();
     console.log(`Shard ${i}: seq=${shard.data().currentSeq}`);
   }
   ```

2. **ハッシュ関数の見直し** (必要に応じて)
   ```typescript
   // より均等な分散を実現
   function betterHash(userId: string): number {
     const crypto = require('crypto');
     const hash = crypto.createHash('md5').update(userId).digest('hex');
     return parseInt(hash.substring(0, 8), 16);
   }
   ```

3. **シャード数増加** (Phase 2で検討)
   - 10 → 20シャードに拡張

---

### 3.4 MVCC統計更新スキップ増加

#### 症状
```log
[WARN] MVCC Skip Rate: 15% (150/1000 users)
```

#### 原因
- ユーザーの高頻度カード操作
- 統計更新とカード更新の競合

#### 対策

1. **スキップ率モニタリング**
   ```typescript
   // カスタムメトリクス追加
   logMetric('mvcc_skip_rate', skipCount / totalUsers, {
     timestamp: Date.now()
   });
   ```

2. **更新頻度調整** (Phase 2検討)
   - 1分 → 5分に変更（リアルタイム性が不要な場合）

3. **ユーザー別スキップ追跡**
   ```typescript
   // 繰り返しスキップされるユーザーを検出
   const frequentSkips = await firestore
     .collection('users')
     .where('mvccSkipCount', '>', 10)
     .get();
   ```

---

## 4. パフォーマンス最適化

### 4.1 Cold Start対策

#### 最小インスタンス設定

```javascript
// functions/src/index.ts
export const getGlobalSequence = functions
  .runWith({
    minInstances: 1,  // 常時1インスタンス起動
    maxInstances: 10
  })
  .https.onCall(async (data, context) => {
    // ...
  });
```

### 4.2 バッチ処理最適化

```typescript
// 並列度制御
import pLimit from 'p-limit';

const limit = pLimit(10); // 同時10並列まで

const promises = users.map(user => 
  limit(() => updateUserStats(user.id))
);

await Promise.allSettled(promises);
```

---

## 5. バックアップ・リストア

### 5.1 データバックアップ

```bash
# Firestore Export
gcloud firestore export gs://<bucket-name>/backups/$(date +%Y%m%d) \
  --collection-ids=idempotency_cache,_system
```

### 5.2 リストア

```bash
# Firestore Import
gcloud firestore import gs://<bucket-name>/backups/20260131
```

---

## 6. メンテナンスウィンドウ

### 6.1 計画的停止手順

1. **事前通知** (24時間前)
   ```typescript
   // クライアント向けメンテナンス通知
   await firestore.collection('_system').doc('maintenance').set({
     scheduled: true,
     startTime: Timestamp.fromDate(new Date('2026-02-01T02:00:00Z')),
     estimatedDuration: 30 // 分
   });
   ```

2. **Function無効化**
   ```bash
   # Cloud Schedulerを一時停止
   gcloud scheduler jobs pause stats-update-trigger --location=asia-northeast1
   ```

3. **メンテナンス実行**
   - データマイグレーション
   - インデックス再構築
   - パフォーマンステスト

4. **再開**
   ```bash
   gcloud scheduler jobs resume stats-update-trigger --location=asia-northeast1
   ```

---

## 7. セキュリティチェックリスト

- [ ] Firebase Authentication必須化
- [ ] Firestore Rulesでクライアント直接アクセス禁止
- [ ] Cloud Functions環境変数に機密情報なし
- [ ] HTTPS強制
- [ ] CORS設定（必要に応じて）
- [ ] Rate Limiting実装
- [ ] 入力バリデーション完備
- [ ] エラーメッセージに機密情報含まない

---

## 8. コスト管理

### 8.1 見積もり（月間）

| リソース | 使用量 | 単価 | 月額 |
|---------|--------|------|------|
| Cloud Functions実行 | 100万回 | $0.40/100万 | $0.40 |
| Firestore読み取り | 1,000万回 | $0.06/100万 | $0.60 |
| Firestore書き込み | 100万回 | $0.18/100万 | $0.18 |
| Cloud Scheduler | 3ジョブ | $0.10/ジョブ | $0.30 |
| **合計** | | | **$1.48** |

### 8.2 コスト最適化

- **Firestore読み取り削減**: キャッシュ活用
- **Function実行時間短縮**: コード最適化
- **不要なログ削減**: ログレベル調整

---

**作成日**: 2026-01-31  
**バージョン**: 1.0.0  
**ドキュメント分類**: 運用ガイド
