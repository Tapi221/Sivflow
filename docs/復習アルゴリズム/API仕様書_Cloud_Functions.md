# Cloud Functions API仕様書

## 概要

Phase 1 & 1.5 競合制御システムで提供されるCloud Functions APIの詳細仕様。

**Phase 1 APIs**:
- `getGlobalSequence`: グローバルシーケンス採番
- `executeIdempotentOperation`: 冪等操作実行
- `scheduledStatsUpdate`: 統計バッチ更新

**Phase 1.5 APIs** (PoC 2):
- `getTemporarySequence`: 仮シーケンス即時発行
- `resolveSequence`: マッピング状況確認
- `processSequenceMappingQueue`: バックグラウンドマッピング処理

---

## 1. getGlobalSequence

### 1.1 エンドポイント

```
POST https://<region>-<project-id>.cloudfunctions.net/getGlobalSequence
```

### 1.2 認証

- **必要**: Firebase Authentication Token
- **Header**: `Authorization: Bearer <idToken>`

### 1.3 リクエスト

#### パラメータ

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | string | Yes | ユーザーID |

#### 例

```json
{
  "userId": "user_abc123"
}
```

#### cURL例

```bash
curl -X POST \
  https://asia-northeast1-flashcard-master.cloudfunctions.net/getGlobalSequence \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_abc123"}'
```

### 1.4 レスポンス

#### 成功時（200 OK）

```json
{
  "globalSeq": 123456,
  "shardId": 3,
  "timestamp": "2026-01-31T12:34:56.789Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `globalSeq` | number | グローバルシーケンス番号 |
| `shardId` | number | 使用されたシャードID (0-9) |
| `timestamp` | string | 採番時刻 (ISO 8601) |

#### エラー時（4xx / 5xx）

```json
{
  "error": {
    "code": "UNAVAILABLE",
    "message": "Failed to acquire sequence after 3 retries",
    "details": {
      "shardId": 3,
      "retryCount": 3
    }
  }
}
```

### 1.5 実装詳細

#### シャード選択ロジック

```typescript
function getShardId(userId: string): number {
  const hash = hashCode(userId);
  return Math.abs(hash) % 10;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
```

#### リトライポリシー

- **最大リトライ回数**: 3回
- **バックオフ**: 指数バックオフ (100ms, 200ms, 400ms)
- **タイムアウト**: 5秒

---

## 2. executeIdempotentOperation

### 2.1 エンドポイント

```
POST https://<region>-<project-id>.cloudfunctions.net/executeIdempotentOperation
```

### 2.2 認証

- **必要**: Firebase Authentication Token
- **Header**: `Authorization: Bearer <idToken>`

### 2.3 リクエスト

#### パラメータ

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `requestId` | string | Yes | UUID v4 (リクエスト識別子) |
| `clientSeq` | number | Yes | クライアント側シーケンス番号 |
| `operation` | string | Yes | 操作タイプ (`createCard`, `updateCard`, `deleteCard`) |
| `data` | object | Yes | 操作データ（操作タイプ依存） |

#### 例: カード作成

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "clientSeq": 42,
  "operation": "createCard",
  "data": {
    "question": "What is React?",
    "answer": "A JavaScript library for building user interfaces",
    "folderId": "folder_xyz789",
    "tags": ["frontend", "javascript"]
  }
}
```

#### 例: カード更新

```json
{
  "requestId": "650e8400-e29b-41d4-a716-446655440001",
  "clientSeq": 43,
  "operation": "updateCard",
  "data": {
    "cardId": "card_abc123",
    "question": "What is React hooks?",
    "answer": "Functions that let you use state in function components"
  }
}
```

#### 例: カード削除

```json
{
  "requestId": "750e8400-e29b-41d4-a716-446655440002",
  "clientSeq": 44,
  "operation": "deleteCard",
  "data": {
    "cardId": "card_abc123"
  }
}
```

### 2.4 レスポンス

#### 成功時（200 OK）

```json
{
  "success": true,
  "result": {
    "cardId": "card_abc123",
    "globalSeq": 123456,
    "createdAt": "2026-01-31T12:34:56.789Z"
  }
}
```

#### Idempotent Success（既に処理済み）

```json
{
  "success": true,
  "cached": true,
  "result": {
    "cardId": "card_abc123",
    "globalSeq": 123456,
    "createdAt": "2026-01-31T12:34:56.789Z"
  }
}
```

#### エラー時: ResyncRequired

```json
{
  "success": false,
  "error": {
    "code": "RESYNC_REQUIRED",
    "message": "Client sequence out of order. Full resync required.",
    "details": {
      "expectedSeq": 42,
      "receivedSeq": 50,
      "lastProcessedSeq": 41
    }
  }
}
```

#### エラー時: TooManyRequests

```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Lock conflict detected. Retry with exponential backoff.",
    "details": {
      "lockHolder": "request_xyz",
      "lockExpiry": "2026-01-31T12:35:00.000Z",
      "retryAfterMs": 1000
    }
  }
}
```

### 2.5 実装詳細

#### Idempotency保証フロー

```typescript
export async function executeIdempotentOperation(
  requestId: string,
  userId: string,
  clientSeq: number,
  operation: string,
  data: any
): Promise<OperationResult> {
  // 1. requestIdでキャッシュ確認
  const cached = await getIdempotencyRecord(userId, requestId);
  if (cached) {
    return cached.result; // 既に処理済み
  }

  // 2. clientSeqの順序検証
  const userState = await getUserSequenceState(userId);
  if (clientSeq > userState.lastProcessedClientSeq + 1) {
    throw new ResyncRequiredError(
      `Expected ${userState.lastProcessedClientSeq + 1}, got ${clientSeq}`
    );
  }
  if (clientSeq <= userState.lastProcessedClientSeq) {
    return { skipped: true }; // 既に処理済み（古い操作）
  }

  // 3. ロック確保
  await createIdempotencyRecord(userId, requestId, {
    status: 'processing',
    clientSeq,
    createdAt: Timestamp.now(),
    ttl: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000) // 30分
  });

  try {
    // 4. 実際の操作実行
    const result = await performOperation(operation, data);

    // 5. 成功を記録
    await updateIdempotencyRecord(userId, requestId, {
      status: 'completed',
      result
    });

    // 6. userStateの更新
    await updateUserSequenceState(userId, clientSeq);

    return result;
  } catch (error) {
    // エラーを記録
    await updateIdempotencyRecord(userId, requestId, {
      status: 'failed',
      error: error.message
    });
    throw error;
  }
}
```

---

## 3. scheduledStatsUpdate

### 3.1トリガー

```
Cloud Scheduler → Pub/Sub Topic → Cloud Function
```

- **Cron式**: `* * * * *` (毎分)
- **タイムゾーン**: Asia/Tokyo
- **Topic**: `stats-trigger`

### 3.2 実行フロー

```typescript
export async function scheduledStatsUpdate(
  message: PubSubMessage
): Promise<void> {
  const startTime = Timestamp.now();
  
  // 1. 更新対象ユーザーを取得
  const users = await fetchActiveUsers();
  
  // 2. 並列処理
  const results = await Promise.allSettled(
    users.map(user => updateUserStats(user.id, startTime))
  );
  
  // 3. 結果ログ
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Stats update completed: ${succeeded} succeeded, ${failed} failed`);
}
```

### 3.3 MVCC統計更新ロジック

```typescript
async function updateUserStats(
  userId: string,
  snapshotTime: Timestamp
): Promise<void> {
  // 1. スナップショット取得
  const cards = await fetchUserCards(userId);
  
  // 2. ローカル集計
  const stats = {
    totalCards: cards.length,
    reviewedCards: cards.filter(c => c.lastReviewAt).length,
    averageRetention: calculateRetention(cards),
    // ... 他の統計
  };
  
  // 3. 条件付き更新（MVCC）
  await firestore.runTransaction(async (tx) => {
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await tx.get(userRef);
    
    // 競合検出
    if (userDoc.data().lastCardUpdateAt > snapshotTime) {
      console.warn(`[SKIP] User ${userId}: concurrent update detected`);
      return; // 次回バッチで処理
    }
    
    // 更新実行
    tx.update(userRef, {
      stats,
      lastStatsUpdateAt: snapshotTime
    });
  });
}
```

---

## 4. エラーコード一覧

| Code | HTTP Status | Description | Client Action |
|------|-------------|-------------|---------------|
| `RESYNC_REQUIRED` | 412 | clientSeq順序違反 | フルリセット+再同期 |
| `TOO_MANY_REQUESTS` | 429 | ロック競合 | 指数バックオフリトライ |
| `INVALID_ARGUMENT` | 400 | パラメータ不正 | エラー修正後再送 |
| `UNAUTHENTICATED` | 401 | 認証トークン無効 | 再ログイン |
| `PERMISSION_DENIED` | 403 | 権限不足 | ユーザーに通知 |
| `NOT_FOUND` | 404 | リソース不存在 | UI更新 |
| `DEADLINE_EXCEEDED` | 504 | タイムアウト | リトライ |
| `UNAVAILABLE` | 503 | サービス一時停止 | リトライ (Backoff) |
| `INTERNAL` | 500 | 内部エラー | エラーログ送信 |

---

## 5. レート制限

### 5.1 ユーザーあたりの制限

| API | 制限 | ウィンドウ |
|-----|------|-----------|
| getGlobalSequence | 100 req/min | 1分 |
| executeIdempotentOperation | 1,000 ops/10min | 10分 |

### 5.2 グローバル制限

| リソース | 制限 | 備考 |
|---------|------|------|
| Global Sequence Shards | 10 shards | 並列度上限 |
| Idempotency Cache TTL | 30分 | 自動削除 |

---

## 6. セキュリティ

### 6.1 認証

- **Firebase Authentication**: すべてのエンドポイントで必須
- **Token検証**: `admin.auth().verifyIdToken()`

### 6.2 認可

```typescript
// userId一致チェック
if (request.auth.uid !== requestBody.userId) {
  throw new functions.https.HttpsError(
    'permission-denied',
    'User ID mismatch'
  );
}
```

### 6.3 入力検証

```typescript
// TypeScript型検証
import Joi from 'joi';

const schema = Joi.object({
  requestId: Joi.string().uuid().required(),
  clientSeq: Joi.number().integer().min(0).required(),
  operation: Joi.string().valid('createCard', 'updateCard', 'deleteCard').required(),
  data: Joi.object().required()
});

const { error } = schema.validate(requestBody);
if (error) {
  throw new functions.https.HttpsError('invalid-argument', error.message);
}
```

---

## 7. モニタリング

### 7.1 Cloud Functions Metrics

```bash
# Cloud Logging
gcloud logging read "resource.type=cloud_function" \
  --limit 50 \
  --format json

# Metrics Explorer
- Function Execution Count
- Function Execution Time (P50, P95, P99)
- Function Error Rate
```

### 7.2 カスタムメトリクス

```typescript
// functions/src/utils/metrics.ts
import { Logging } from '@google-cloud/logging';

const logging = new Logging();
const log = logging.log('concurrency-control');

export function logMetric(metricName: string, value: number, labels: Record<string, string>) {
  const entry = log.entry({
    resource: { type: 'cloud_function' },
    severity: 'INFO',
    jsonPayload: {
      metric: metricName,
      value,
      ...labels
    }
  });
  log.write(entry);
}

// 使用例
logMetric('idempotency_cache_hit', 1, { userId: 'user123', operation: 'createCard' });
```

---

## 8. テスト用エンドポイント

### 8.1 開発環境専用API

```typescript
// functions/src/index.ts (開発環境のみ)
export const resetTestData = functions.https.onRequest(async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(403).send('Forbidden');
    return;
  }
  
  // テストデータリセット
  await firestore.collection('idempotency_cache').listDocuments()
    .then(docs => Promise.all(docs.map(doc => doc.delete())));
  
  res.send({ success: true, message: 'Test data reset' });
});
```

---

**作成日**: 2026-01-31  
**バージョン**: 1.0.0  
**ドキュメント分類**: API仕様書
