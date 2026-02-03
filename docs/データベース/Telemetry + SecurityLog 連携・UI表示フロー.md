Telemetry + SecurityLog 連携・UI表示フロー
目的

ユーザー側: 自分のデバイス状況やセキュリティイベントを確認

管理者側: 異常端末や高リスクユーザーの監査を容易にする

TelemetryとSecurityLogを統合し、UI表示に反映する

1. データ取得
1-1. クライアント同期

SyncService起動時に、Firestore users/{userId}/securityLogs を取得

最終表示時間以降の新規ログのみ差分取得

const q = query(
  collection(db, `users/${userId}/securityLogs`),
  where('occurredAt', '>', lastViewedTimestamp),
  orderBy('occurredAt', 'desc'),
  limit(50)
);
const snapshot = await getDocs(q);
const logs = snapshot.docs.map(doc => doc.data() as SecurityLog);

1-2. Telemetry統合

SyncServiceのTelemetry情報に、ユーザー操作・同期状態・端末情報を追加

SecurityLogと合わせてリスク可視化

2. UI表示設計
2-1. ユーザー画面

「セキュリティ」タブにログをリスト表示

イベントタイプに応じたアイコン・色分け

info → 青

warning → 黄

critical → 赤

ログ詳細: 日時、端末名、概要、必要に応じて metadata

例:
⚠️ 警告: 2026/02/02 14:00 - 無効化された iPhone 12 からのアクセスがありました。

2-2. 管理者画面

リアルタイムダッシュボード

高RiskScoreユーザー一覧

最近の Revoke / SafeMode / Lock 操作

検索・フィルタ: DeviceID, EventType, Severity, 日付

3. データ更新・既読管理

ログを取得後、lastViewedAt を Firestore / localStorage に保存

差分のみUIに反映し、過去ログは省略可能

未読件数表示も可能

4. セキュリティ配慮

UIに露出する情報はユーザー自身に関するもののみ

他ユーザーの deviceId や IP などは非表示

criticalイベントはユーザー通知と併用

5. 実装メモ

React / Vue / Svelteなどのフロントフレームワークでリスト表示可能

Virtualized Listで大量ログのパフォーマンス対策

端末情報は deviceName + deviceId を内部保持、UIには deviceName のみ表示