異常検知ルールとRiskScore設計
目的

不正アクセスや異常挙動を自動的に検知

ユーザー単位・端末単位でリスクをスコア化

高リスク時にアラート表示や強制対処（ログアウト、2FA要求など）

1. 異常イベント分類
カテゴリ	イベント例	備考
認証異常	LOGIN_FAILED ×連続, SYNC_AUTH_ERROR	短時間で多数の失敗があればリスクUP
端末異常	DEVICE_REVOKED / ACCESS_DENIED_REVOKED	無効化済み端末のアクセス試行
重要操作失敗	SENSITIVE_OP_REVOKED	削除や変更の失敗
管理操作	ADMIN_DEVICE_REVOKE / ADMIN_ACCOUNT_LOCK	管理者の操作はリスク判定にも影響
初回登録	DEVICE_NEW_REGISTER	初回デバイスは警戒度低めだが監視は必要
2. RiskScore設計
2-1. 基本方針

0〜100の整数スコアで表現

イベントの重要度・頻度・時間間隔で加算

一定期間経過で減算（自然復旧）

2-2. 加算ルール（例）
イベントType	重み	説明
LOGIN_FAILED	+5	1件ごと、短時間での連続失敗は累積
SYNC_AUTH_ERROR	+10	同期権限エラー
ACCESS_DENIED_REVOKED	+30	無効化端末からのアクセス
SENSITIVE_OP_REVOKED	+20	重要操作失敗
DEVICE_REVOKED	+0	自身の操作、スコアには加算しない
ADMIN_DEVICE_REVOKE	+10	管理者による解除
ADMIN_ACCOUNT_LOCK	+50	アカウント凍結は重大
2-3. 減算ルール

一定時間ログがなければ自然減算

RiskScore = max(0, currentScore - decayPerHour * hoursElapsed)


decayPerHourは3〜5程度を想定（調整可能）

3. 異常検知アクション
RiskScore	アクション
0〜20	通常状態
21〜50	注意: ユーザーUIに警告表示
51〜80	高リスク: 次回ログイン時2FA要求、警告メール送信
81〜100	危険: 強制ログアウト、管理者に通知
4. 実装フロー例

SyncService / SecurityLogService で新規イベント取得

イベントTypeと重みを元にRiskScore計算

ユーザー単位・端末単位でスコア更新

UI表示・通知送信

一定時間ごとに減算（自然復旧）

function calculateRiskScore(events: SecurityLog[], currentScore: number): number {
  let score = currentScore;
  const now = Date.now();
  for (const e of events) {
    switch(e.eventType) {
      case 'LOGIN_FAILED': score += 5; break;
      case 'SYNC_AUTH_ERROR': score += 10; break;
      case 'ACCESS_DENIED_REVOKED': score += 30; break;
      case 'SENSITIVE_OP_REVOKED': score += 20; break;
      case 'ADMIN_DEVICE_REVOKE': score += 10; break;
      case 'ADMIN_ACCOUNT_LOCK': score += 50; break;
    }
  }
  // 自然減算（例: 1時間で3減少）
  const hoursElapsed = (now - lastUpdate) / 3600000;
  score = Math.max(0, score - 3 * hoursElapsed);
  return Math.min(100, score);
}