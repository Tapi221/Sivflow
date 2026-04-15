import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { toMillis } from "../utils/toMillis";

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

// 他のトリガーと共有するために初期化済みインスタンスを使う場合は調整
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * セキュリティログ生成時のトリガー
 */
export const onSecurityLogCreated = functions.firestore
  .document("users/{userId}/securityLogs/{logId}")
  .onCreate(
    async (
      snap: functions.firestore.QueryDocumentSnapshot,
      context: functions.EventContext,
    ) => {
      const logData = parseSecurityLogData(snap.data());
      const userId = context.params.userId;
      // const logId = context.params.logId;

      if (!logData) return;

      try {
        // 1. 異常検知 (過去ログ集計・ルール判定)
        await detectAbnormalPatterns(userId, logData);

        // 2. リスクスコア計算
        const riskScore = await calculateRiskScore(userId, logData);

        // 3. 自動対処
        const deviceId = logData.deviceId || "unknown";
        await handleRiskActions(userId, deviceId, riskScore);
      } catch (e) {
        console.error("[SecurityFn] Error:", e);
      }
    },
  );

// --- 実装ロジック ---

interface DetectionRule {
  type: string; // SecurityEventType
  riskScore: number;
  timeWindowMs?: number;
  countThreshold?: number;
  alwaysTrigger?: boolean;
}

type SecurityLogData = {
  eventType: string;
  deviceId?: string;
};

const parseSecurityLogData = (value: unknown): SecurityLogData | null => {
  if (typeof value !== "object" || value === null) return null;

  const { eventType, deviceId } = value as {
    eventType?: unknown;
    deviceId?: unknown;
  };

  if (typeof eventType !== "string" || eventType.length === 0) return null;

  return {
    eventType,
    deviceId: typeof deviceId === "string" ? deviceId : undefined,
  };
};

const DETECTION_RULES: DetectionRule[] = [
  // 認証異常
  {
    type: "LOGIN_FAILED",
    riskScore: 5,
    timeWindowMs: 5 * 60 * 1000,
    countThreshold: 1,
  },
  { type: "SYNC_AUTH_ERROR", riskScore: 10, alwaysTrigger: true },

  // 端末異常
  { type: "ACCESS_DENIED_REVOKED", riskScore: 30, alwaysTrigger: true },

  // 重要操作失敗
  { type: "SENSITIVE_OP_REVOKED", riskScore: 20, alwaysTrigger: true },

  // 管理操作
  { type: "ADMIN_DEVICE_REVOKE", riskScore: 10, alwaysTrigger: true },
  { type: "ADMIN_ACCOUNT_LOCK", riskScore: 50, alwaysTrigger: true },

  // 技術的異常
  {
    type: "LOCK_CONTENTION_EXCESS",
    riskScore: 7,
    timeWindowMs: 5 * 60 * 1000,
    countThreshold: 10,
  },
  {
    type: "SYNC_CONFLICT_EXCESS",
    riskScore: 3,
    timeWindowMs: 5 * 60 * 1000,
    countThreshold: 10,
  },
];

const detectAbnormalPatterns = async (
  userId: string,
  logData: SecurityLogData,
): Promise<boolean> {
  const db = admin.firestore();
  const now = Date.now();
  let isAbnormal = false;

  for (const rule of DETECTION_RULES) {
    if (rule.type !== logData.eventType) continue;

    if (rule.alwaysTrigger) {
      isAbnormal = true;
      continue;
    }

    if (rule.timeWindowMs && rule.countThreshold) {
      const windowStart = new Date(now - rule.timeWindowMs);
      const snapshot = await db
        .collection(`users/${userId}/securityLogs`)
        .where("eventType", "==", rule.type)
        .where("occurredAt", ">=", windowStart)
        .count()
        .get();

      const count = snapshot.data().count;

      // count() はクエリ時点のものを含むかタイミングによるが、
      // ここでは「直近の頻度」を見るため、閾値を超えていれば異常とする
      if (count >= rule.countThreshold) {
        console.warn(
          `[Abnormal Detect] User=${userId}, Type=${rule.type}, Count=${count}`,
        );
        isAbnormal = true;
      }
    }
  }
  return isAbnormal;
};

const calculateRiskScore = async (
  userId: string,
  logData: SecurityLogData,
): Promise<number> {
  const db = admin.firestore();
  const statusRef = db.doc(`users/${userId}/security/status`);

  return db.runTransaction(async (t) => {
    const doc = await t.get(statusRef);
    let currentScore = 0;
    let lastUpdate = Date.now();

    if (doc.exists) {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      currentScore = toFiniteNumber(data.riskScore, 0);
      lastUpdate = toMillis(data.lastUpdate, Date.now());
    }

    // 1. 減衰処理 (1時間につき3点)
    const now = Date.now();
    const hoursElapsed = (now - lastUpdate) / (1000 * 60 * 60);
    if (hoursElapsed > 0) {
      const decay = Math.floor(hoursElapsed * 3);
      currentScore = Math.max(0, currentScore - decay);
    }

    // 2. 加算処理
    let scoreAdded = 0;
    // 今回のイベントがどのルールに該当するか（複数ヒットありうるが簡易的にマッチした最大または合計を加算）
    // 本来は detectAbnormalPatterns の結果を引き回すべきだが、ここでは再判定または単一イベント評価
    const matchedRule = DETECTION_RULES.find(
      (r) => r.type === logData.eventType,
    );
    if (matchedRule) {
      scoreAdded = matchedRule.riskScore;
      currentScore += scoreAdded;
    }

    // 上限キャップ
    currentScore = Math.min(100, currentScore);

    // 保存
    t.set(
      statusRef,
      {
        riskScore: currentScore,
        lastUpdate: FieldValue.serverTimestamp(),
        lastEvent: logData.eventType,
      },
      { merge: true },
    );

    return currentScore;
  });
};

const handleRiskActions = async (
  userId: string,
  deviceId: string,
  riskScore: number,
) {
  const db = admin.firestore();
  console.log(`[Action] User=${userId}, Risk=${riskScore}`);

  // 1. レベル別アクション

  // Level 1: Warning (21-50)
  if (riskScore >= 21) {
    // UI通知を追加 (Mock)
    await db.collection(`users/${userId}/notifications`).add({
      type: "SECURITY_ALERT",
      level: "warning",
      message:
        "不審なアクセスが検知されました。アクティビティを確認してください。",
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });
  }

  // Level 2: 2FA Required (51-80)
  if (riskScore >= 51) {
    // ユーザーメタデータ更新 -> クライアント側でログイン時にチェック
    await db.doc(`users/${userId}`).set(
      {
        requires2FA: true,
        securityAlertLevel: "high",
      },
      { merge: true },
    );

    console.log(`[Action] 2FA Requirement set for user ${userId}`);
  }

  // Level 3: Critical / Force Logout (81+)
  if (riskScore >= 81) {
    // 全デバイスを Revoke
    const devicesRef = db.collection(`sync_metadata/${userId}/devices`);
    const activeDevices = await devicesRef
      .where("status", "==", "active")
      .get();

    const batch = db.batch();
    activeDevices.forEach((doc) => {
      batch.update(doc.ref, {
        status: "revoked",
        revokedAt: FieldValue.serverTimestamp(),
        revokedReason: "RISK_SCORE_THRESHOLD_EXCEEDED",
      });
    });

    // アカウント自体もロック
    batch.set(
      db.doc(`users/${userId}`),
      {
        isAccountLocked: true,
        lockedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();
    console.log(
      `[Action] ALL DEVICES REVOKED and ACCOUNT LOCKED for user ${userId}`,
    );
  }
};
