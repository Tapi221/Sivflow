# Cloud Functions 異常検知フロー設計

## 目的

Firestoreに書き込まれた `users/{userId}/securityLogs/{logId}` をトリガーに、異常パターン検知をリアルタイムで行う。
RiskScore算出 → 通知 / 自動対応までを一気通貫で設計。

## 1. トリガー設計

**イベントソース**:
`users/{userId}/securityLogs/{logId}` への `onCreate`
サーバー発火必須（client書き込みは参考値）

```typescript
export const onSecurityLogCreated = functions.firestore
  .document('users/{userId}/securityLogs/{logId}')
  .onCreate(async (snap, context) => {
    const log = snap.data() as SecurityLog;
    await detectAbnormalPatterns(context.params.userId, log);
  });
```

## 2. 異常パターン集計フロー

### 2-1. 過去履歴取得

直近5分 / 10分のログを集計。

**Firestoreクエリ例**:

```typescript
const recentLogs = await getDocs(query(
  collection(db, `users/${userId}/securityLogs`),
  where('occurredAt', '>=', Timestamp.fromMillis(Date.now() - 10*60*1000))
));
```

### 2-2. ルール適用

Step 1で定義した異常ルールごとにフィルタリング。

**例**: 10分以内の `DEVICE_NEW_REGISTER` が3件以上 → Rule A 発火

### 2-3. RiskScore算出

危険度ごとに加算。
24時間以内減衰、7日間でリセットを適用。

```typescript
let riskScore = 0;
for (const rule of triggeredRules) {
  riskScore += rule.score;
}
```

## 3. 自動対応フロー

RiskScore → Action マッピング

- **0–4**: 記録のみ
- **5–9**: ユーザー通知
- **10–14**: Device safeMode
- **15+**: 強制 revoke / Account lock

### 3-1. 通知

FCM / メール / In-App Alert
Metadata付きで送る

### 3-2. SafeMode

Firestore `users/{userId}/deviceStatus/{deviceId}` に `safeMode: true` をセット。
SyncService側で読み取り、同期制限をかける。

### 3-3. 強制Revoke / Account Lock

Firestore更新 + SecurityLog生成。
クライアントに即時反映。

## 4. 非同期処理・エラー耐性

- **関数リトライ**: Firestore書き込み失敗でも最小限のリトライ
- **重複発火**: idempotency keyで同一イベント二重処理防止
- **バックプレッシャー**: 高負荷時はQueue (Pub/Sub) 経由で処理

## 5. 監査ログ

すべての異常判定と自動対応アクションを、auditLogs に記録
これが Admin Ops のエビデンス になる
。