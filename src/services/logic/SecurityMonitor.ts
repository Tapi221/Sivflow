import { firestoreDb } from '../firebase';
import { collection, addDoc, serverTimestamp, Timestamp, onSnapshot, doc, query, where, updateDoc } from 'firebase/firestore';
import type { SecurityEventType, SecurityLog, SecurityMetadata } from '../../types/telemetry';

/**
 * リスク検知ルールの定義
 * クライアントサイドでの検知ポリシー
 */
interface DetectionRule {
  type: SecurityEventType;
  riskScore: number; // イベントごとの加算スコア
  alwaysTrigger?: boolean; // 閾値なしで即座に加算するか
  timeWindowMs?: number; // 監視窓（ミリ秒）
  countThreshold?: number; // 閾値（回数）
}

/**
 * 異常検知ルールとRiskScore設計に基づく定義
 * @see docs/データベース/異常検知ルールとRiskScore設計.md
 */
const DETECTION_RULES: DetectionRule[] = [
  // 認証異常
  { type: 'LOGIN_FAILED', riskScore: 5, timeWindowMs: 5 * 60 * 1000, countThreshold: 1 }, 
  { type: 'SYNC_AUTH_ERROR', riskScore: 10, alwaysTrigger: true },
  
  // 端末異常
  { type: 'ACCESS_DENIED_REVOKED', riskScore: 30, alwaysTrigger: true },
  
  // 重要操作失敗
  { type: 'SENSITIVE_OP_REVOKED', riskScore: 20, alwaysTrigger: true },
  
  // 管理操作
  { type: 'ADMIN_DEVICE_REVOKE', riskScore: 10, alwaysTrigger: true },
  { type: 'ADMIN_ACCOUNT_LOCK', riskScore: 50, alwaysTrigger: true },
  
  // 技術的異常（以前のルールも保持）
  { type: 'LOCK_CONTENTION_EXCESS', riskScore: 7, timeWindowMs: 5 * 60 * 1000, countThreshold: 10 },
  { type: 'SYNC_CONFLICT_EXCESS', riskScore: 3, timeWindowMs: 5 * 60 * 1000, countThreshold: 10 },
];

/**
 * セキュリティ状態の定義
 */
export interface SecurityState {
  isLocked: boolean;
  requires2FA: boolean;
  alerts: unknown[];
}

/**
 * SecurityMonitor: セキュリティイベントの監視と異常検知を行うクラス
 */
export class SecurityMonitor {
  private userId: string;
  private deviceId: string;
  private eventHistory: { type: SecurityEventType; timestamp: number }[] = [];
  private currentRiskScore: number = 0;
  private lastEvaluationTime: number = Date.now();
  private internalState: SecurityState = {
    isLocked: false,
    requires2FA: false,
    alerts: []
  };

  constructor(userId: string, deviceId: string) {
    this.userId = userId;
    this.deviceId = deviceId;
    this.loadState();
  }

  /**
   * イベントを記録し、異常検知を実行する
   */
  async logEvent(type: SecurityEventType, metadata: SecurityMetadata = {}): Promise<void> {
    const now = Date.now();
    this.eventHistory.push({ type, timestamp: now });
    
    // 履歴のクリーンアップ (古いイベントを削除)
    // 最大の時間窓を持つルールに合わせる (ここでは10分程度あれば十分)
    const maxWindow = 10 * 60 * 1000;
    this.eventHistory = this.eventHistory.filter(e => e.timestamp > now - maxWindow);

    // ログをFirestoreへ送信
    await this.sendSecurityLog(type, metadata);

    // ルール評価
    this.evaluateRules(type);
    
    // 永続化
    this.saveState();
  }

  /**
   * 異常検知ルールの評価
   */
  private evaluateRules(triggerType: SecurityEventType): void {
    const now = Date.now();
    let scoreAdded = 0;

    for (const rule of DETECTION_RULES) {
      if (rule.type !== triggerType) continue;

      let shouldTrigger = false;

      if (rule.alwaysTrigger) {
        shouldTrigger = true;
      } else if (rule.timeWindowMs && rule.countThreshold) {
        const recentCount = this.eventHistory.filter(
          e => e.type === rule.type && e.timestamp > now - rule.timeWindowMs!
        ).length;
        // 今回のイベントで閾値に達した、あるいは超えている場合に加算（多重加算防止は簡易）
        if (recentCount >= rule.countThreshold) {
            shouldTrigger = true;
        }
      }

      if (shouldTrigger) {
        console.warn(`[Security] Risk score added: +${rule.riskScore} by ${rule.type}`);
        this.currentRiskScore += rule.riskScore;
        scoreAdded += rule.riskScore;
      }
    }
    
    // 減衰処理（自然復旧）
    this.applyDecay(now);
    
    // 上限キャップ (0-100)
    this.currentRiskScore = Math.min(100, Math.max(0, this.currentRiskScore));
  }

  /**
   * リスクスコアの減衰処理
   * 1時間ごとの減算処理 (decayPerHour = 3)
   */
  private applyDecay(now: number): void {
    const hoursElapsed = (now - this.lastEvaluationTime) / (1000 * 60 * 60);
    if (hoursElapsed > 0) {
      const decay = Math.floor(hoursElapsed * 3); // 1時間で3減少
      if (decay > 0) {
        this.currentRiskScore = Math.max(0, this.currentRiskScore - decay);
        this.lastEvaluationTime = now;
      }
    }
  }

  /**
   * Firestoreへセキュリティログを送信
   */
  private async sendSecurityLog(type: SecurityEventType, metadata: SecurityMetadata): Promise<void> {
    try {
      if (!firestoreDb) {
        console.warn('[Security] firestoreDb is undefined. Skipping security log.');
        return;
      }
      const logData: Omit<SecurityLog, 'logId'> = {
        userId: this.userId,
        deviceId: this.deviceId,
        eventType: type,
        severity: this.getSeverity(type),
        source: 'client',
        isUserVisible: this.isUserVisible(type),
        description: this.getDescription(type),
        metadata,
        occurredAt: serverTimestamp()
      };
      
      await addDoc(collection(firestoreDb, `users/${this.userId}/securityLogs`), logData);
    } catch (error) {
      console.error('[Security] Failed to send log:', error);
      // 送信失敗自体もリスクだが、無限ループ防止のためここでは握りつぶす
    }
  }

  /**
   * イベントタイプから重要度を判定
   */
  private getSeverity(type: SecurityEventType): 'info' | 'warning' | 'critical' {
    switch (type) {
      case 'ACCESS_DENIED_REVOKED':
      case 'LOCK_CONTENTION_EXCESS':
      case 'ADMIN_ACCOUNT_LOCK':
        return 'critical';
      case 'DEVICE_REVOKED':
      case 'SYNC_AUTH_ERROR':
      case 'SYNC_CONFLICT_EXCESS':
      case 'ADMIN_DEVICE_REVOKE':
      case 'SENSITIVE_OP_REVOKED':
        return 'warning';
      default:
        return 'info';
    }
  }

    /**
   * ユーザーに表示すべきかどうか
   */
    private isUserVisible(type: SecurityEventType): boolean {
        // 基本的に内部的な異常検知はユーザーに見せないが、
        // アカウントロックや新しいデバイス登録などは見せる
        switch(type) {
            case 'DEVICE_NEW_REGISTER':
            case 'LOGIN_SUCCESS':
            case 'DEVICE_REVOKED':
            case 'ADMIN_ACCOUNT_LOCK':
                return true;
            default:
                return false;
        }
    }

  /**
   * デフォルトの説明文
   */
  private getDescription(type: SecurityEventType): string {
    // 簡易的なマッピング。多言語対応が必要な場合は別途翻訳リソースを使う。
    const descMap: Record<SecurityEventType, string> = {
      'LOGIN_SUCCESS': 'ログインに成功しました',
      'LOGIN_FAILED': 'ログインに失敗しました',
      'DEVICE_REVOKED': 'デバイス登録が解除されました',
      'ACCESS_DENIED_REVOKED': '無効化されたデバイスからのアクセスを拒否しました',
      'SYNC_AUTH_ERROR': '同期の認証エラーが発生しました',
      'SENSITIVE_OP_REVOKED': '権限のない重要な操作が拒否されました',
      'DEVICE_NEW_REGISTER': '新しいデバイスが登録されました',
      'LOCK_CONTENTION_EXCESS': '同期ロックの頻繁な競合（奪取ループ）を検知しました',
      'SYNC_CONFLICT_EXCESS': 'データ競合が異常に多発しています',
      'ADMIN_DEVICE_REVOKE': '管理者によりデバイスが解除されました',
      'ADMIN_ACCOUNT_LOCK': '管理者によりアカウントがロックされました',
      'ADMIN_LOG_EXPORT': '監査ログが出力されました'
    };
    return descMap[type] || 'セキュリティイベントが発生しました';
  }

  /**
   * 現在のセキュリティ状態（SafeModeかどうか等）を取得
   */
  getSecurityStatus(): { isSafeMode: boolean; riskScore: number } {
    // リスクスコア 10以上で SafeMode
    return {
      isSafeMode: this.currentRiskScore >= 10,
      riskScore: this.currentRiskScore
    };
  }

  private unsubscribeMetadata: (() => void) | null = null;
  private unsubscribeNotifications: (() => void) | null = null;

  /**
   * リアルタイム監視を開始する
   * - ユーザーメタデータ (ロック状態, 2FA)
   * - セキュリティ通知
   */
  startMonitoring(onStateChange: (state: SecurityState) => void): void {
    if (!firestoreDb) {
      console.error('[Security] firestoreDb is undefined. Cannot start monitoring.');
      return;
    }
    // 1. メタデータ監視
    this.unsubscribeMetadata = onSnapshot(doc(firestoreDb, `users/${this.userId}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        this.internalState.isLocked = data.isAccountLocked === true;
        this.internalState.requires2FA = data.requires2FA === true;
        
        onStateChange({ ...this.internalState });
      }
    }, (error) => {
      console.error('[Security] Metadata monitoring failed:', error);
    });

    // 2. 通知監視 (SecurityAlertの未読)
    const q = query(
      collection(firestoreDb, `users/${this.userId}/notifications`),
      where('type', '==', 'SECURITY_ALERT'),
      where('read', '==', false)
    );

    this.unsubscribeNotifications = onSnapshot(q, (snapshot) => {
      this.internalState.alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      onStateChange({ ...this.internalState });
    }, (error) => {
      // Permisson errors are expected if rules are not set up. Suppress to avoid spam.
      if (error.code !== 'permission-denied') {
        console.warn('[Security] Notification monitoring failed (non-permission error):', error);
      }
    });
  }

  /**
   * 通知を既読にする
   */
  async dismissAlert(alertId: string): Promise<void> {
    try {
      if (!firestoreDb) throw new Error('Firebase Firestore is not initialized.');
      const alertRef = doc(firestoreDb, `users/${this.userId}/notifications`, alertId);
      await updateDoc(alertRef, { read: true });
    } catch (error) {
      console.error('[Security] Failed to dismiss alert:', error);
    }
  }

  /**
   * 監視を停止する
   */
  stopMonitoring(): void {
    if (this.unsubscribeMetadata) {
      this.unsubscribeMetadata();
      this.unsubscribeMetadata = null;
    }
    if (this.unsubscribeNotifications) {
      this.unsubscribeNotifications();
      this.unsubscribeNotifications = null;
    }
  }

  /**
   * 状態の保存 (localStorage)
   */
  private saveState(): void {
    localStorage.setItem(`security_score_${this.userId}`, this.currentRiskScore.toString());
    localStorage.setItem(`security_last_eval_${this.userId}`, this.lastEvaluationTime.toString());
  }

  /**
   * 状態の読み込み
   */
  private loadState(): void {
    const score = localStorage.getItem(`security_score_${this.userId}`);
    const time = localStorage.getItem(`security_last_eval_${this.userId}`);
    if (score) this.currentRiskScore = parseInt(score, 10);
    if (time) this.lastEvaluationTime = parseInt(time, 10);
  }
}
