import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { toMillis } from "../utils/toMillis";
import {
  RISK_SCORE_THRESHOLDS,
  calculateNextRiskScore,
  evaluateDetectionRule,
  type RiskLevel,
} from "./policy";
import { isSupportedSecurityEventType, type SecurityEventType } from "./contract";

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const toUserSecurityAlertLevel = (
  riskLevel: RiskLevel,
): "normal" | "high" | "critical" => {
  switch (riskLevel) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    default:
      return "normal";
  }
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

      if (!logData) return;

      try {
        // 1. 異常検知 (過去ログ集計・ルール判定)
        const detectionOutcome = await evaluateDetectionRule({
          db: admin.firestore(),
          userId,
          eventType: logData.eventType,
          occurredAtMs: logData.occurredAtMs,
        });

        if (detectionOutcome.triggered) {
          console.warn(
            "[Abnormal Detect]",
            JSON.stringify({
              userId,
              type: logData.eventType,
              windowCount: detectionOutcome.windowCount,
              scoreAdded: detectionOutcome.scoreAdded,
            }),
          );
        }

        // 2. リスクスコア計算
        const scoreUpdate = await calculateRiskScore({
          userId,
          eventType: logData.eventType,
          occurredAtMs: logData.occurredAtMs,
          scoreAdded: detectionOutcome.scoreAdded,
        });

        // 3. 自動対処
        await handleRiskActions(userId, scoreUpdate);
      } catch (e) {
        console.error("[SecurityFn] Error:", e);
      }
    },
  );

type SecurityLogData = {
  eventType: SecurityEventType;
  occurredAtMs: number;
};

const parseSecurityLogData = (value: unknown): SecurityLogData | null => {
  if (typeof value !== "object" || value === null) return null;

  const { eventType, occurredAt } = value as {
    eventType?: unknown;
    occurredAt?: unknown;
  };

  if (
    typeof eventType !== "string" ||
    !isSupportedSecurityEventType(eventType)
  ) {
    return null;
  }

  return {
    eventType,
    occurredAtMs: toMillis(occurredAt, Date.now()),
  };
};

type SecurityScoreUpdate = {
  previousScore: number;
  nextScore: number;
  riskLevel: RiskLevel;
};

const calculateRiskScore = async (
  {
    userId,
    eventType,
    occurredAtMs,
    scoreAdded,
  }: {
    userId: string;
    eventType: SecurityEventType;
    occurredAtMs: number;
    scoreAdded: number;
  },
): Promise<SecurityScoreUpdate> => {
  const db = admin.firestore();
  const statusRef = db.doc(`users/${userId}/security/status`);

  return await db.runTransaction(async (t) => {
    const doc = await t.get(statusRef);
    let persistedScore = 0;
    let lastUpdateMs = occurredAtMs;

    if (doc.exists) {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      persistedScore = toFiniteNumber(data.riskScore, 0);
      lastUpdateMs = toMillis(data.lastUpdate, occurredAtMs);
    }

    const { previousScore, nextScore, riskLevel } = calculateNextRiskScore({
      persistedScore,
      lastUpdateMs,
      nowMs: occurredAtMs,
      scoreAdded,
    });

    // 保存
    t.set(
      statusRef,
      {
        riskScore: nextScore,
        riskLevel,
        lastUpdate: FieldValue.serverTimestamp(),
        lastEvent: eventType,
        ...(scoreAdded > 0 ? { lastTriggeredRule: eventType } : {}),
      },
      { merge: true },
    );

    return {
      previousScore,
      nextScore,
      riskLevel,
    };
  });
};

const handleRiskActions = async (
  userId: string,
  scoreUpdate: SecurityScoreUpdate,
) {
  const db = admin.firestore();
  const { previousScore, nextScore, riskLevel } = scoreUpdate;

  console.log(
    `[Action] User=${userId}, PrevRisk=${previousScore}, Risk=${nextScore}, Level=${riskLevel}`,
  );

  const crossedWarning =
    previousScore < RISK_SCORE_THRESHOLDS.warning &&
    nextScore >= RISK_SCORE_THRESHOLDS.warning;
  const crossedRequire2FA =
    previousScore < RISK_SCORE_THRESHOLDS.require2FA &&
    nextScore >= RISK_SCORE_THRESHOLDS.require2FA;
  const crossedAccountLock =
    previousScore < RISK_SCORE_THRESHOLDS.accountLock &&
    nextScore >= RISK_SCORE_THRESHOLDS.accountLock;

  if (crossedWarning) {
    await db.collection(`users/${userId}/notifications`).add({
      type: "SECURITY_ALERT",
      level: "warning",
      message:
        "不審なアクセスが検知されました。アクティビティを確認してください。",
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });
  }

  if (crossedRequire2FA) {
    await db.doc(`users/${userId}`).set(
      {
        requires2FA: true,
        securityAlertLevel: toUserSecurityAlertLevel(riskLevel),
      },
      { merge: true },
    );

    console.log(`[Action] 2FA Requirement set for user ${userId}`);
  }

  if (crossedAccountLock) {
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
        securityAlertLevel: toUserSecurityAlertLevel(riskLevel),
      },
      { merge: true },
    );

    await batch.commit();
    console.log(
      `[Action] ALL DEVICES REVOKED and ACCOUNT LOCKED for user ${userId}`,
    );
  }
};
