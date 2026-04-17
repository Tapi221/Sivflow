import type { Firestore } from "firebase-admin/firestore";
import { type SecurityEventType } from "./contract";

export type RiskLevel = "normal" | "warning" | "high" | "critical";

export interface DetectionRule {
  type: SecurityEventType;
  riskScore: number;
  alwaysTrigger?: boolean;
  timeWindowMs?: number;
  countThreshold?: number;
}

export type DetectionOutcome = {
  matchedRule: DetectionRule | null;
  triggered: boolean;
  scoreAdded: number;
  windowCount: number | null;
};

export const DETECTION_RULES: readonly DetectionRule[] = [
  {
    type: "LOGIN_FAILED",
    riskScore: 5,
    timeWindowMs: 5 * 60 * 1000,
    countThreshold: 1,
  },
  { type: "SYNC_AUTH_ERROR", riskScore: 10, alwaysTrigger: true },
  { type: "ACCESS_DENIED_REVOKED", riskScore: 30, alwaysTrigger: true },
  { type: "SENSITIVE_OP_REVOKED", riskScore: 20, alwaysTrigger: true },
  { type: "ADMIN_DEVICE_REVOKE", riskScore: 10, alwaysTrigger: true },
  { type: "ADMIN_ACCOUNT_LOCK", riskScore: 50, alwaysTrigger: true },
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
] as const;

export const RISK_SCORE_THRESHOLDS = {
  warning: 21,
  require2FA: 51,
  accountLock: 81,
} as const;

export const RISK_DECAY_PER_HOUR = 3;
export const MAX_RISK_SCORE = 100;

const clampRiskScore = (score: number) => {
  return Math.min(MAX_RISK_SCORE, Math.max(0, score));
};

export const getRiskLevel = (riskScore: number): RiskLevel => {
  if (riskScore >= RISK_SCORE_THRESHOLDS.accountLock) {
    return "critical";
  }
  if (riskScore >= RISK_SCORE_THRESHOLDS.require2FA) {
    return "high";
  }
  if (riskScore >= RISK_SCORE_THRESHOLDS.warning) {
    return "warning";
  }
  return "normal";
};

export const applyRiskDecay = ({
  currentScore,
  lastUpdateMs,
  nowMs,
}: {
  currentScore: number;
  lastUpdateMs: number;
  nowMs: number;
}) => {
  const hoursElapsed = (nowMs - lastUpdateMs) / (1000 * 60 * 60);
  if (hoursElapsed <= 0) {
    return clampRiskScore(currentScore);
  }

  const decay = Math.floor(hoursElapsed * RISK_DECAY_PER_HOUR);
  return clampRiskScore(currentScore - decay);
};

export const resolveDetectionOutcome = ({
  eventType,
  eventCountInWindow,
}: {
  eventType: SecurityEventType;
  eventCountInWindow?: number;
}): DetectionOutcome => {
  const matchedRule =
    DETECTION_RULES.find((rule) => rule.type === eventType) ?? null;

  if (!matchedRule) {
    return {
      matchedRule: null,
      triggered: false,
      scoreAdded: 0,
      windowCount: null,
    };
  }

  if (matchedRule.alwaysTrigger) {
    return {
      matchedRule,
      triggered: true,
      scoreAdded: matchedRule.riskScore,
      windowCount: null,
    };
  }

  if (matchedRule.timeWindowMs && matchedRule.countThreshold) {
    const windowCount = eventCountInWindow ?? 0;
    const triggered = windowCount >= matchedRule.countThreshold;
    return {
      matchedRule,
      triggered,
      scoreAdded: triggered ? matchedRule.riskScore : 0,
      windowCount,
    };
  }

  return {
    matchedRule,
    triggered: false,
    scoreAdded: 0,
    windowCount: null,
  };
};

export const calculateNextRiskScore = ({
  persistedScore,
  lastUpdateMs,
  nowMs,
  scoreAdded,
}: {
  persistedScore: number;
  lastUpdateMs: number;
  nowMs: number;
  scoreAdded: number;
}) => {
  const previousScore = applyRiskDecay({
    currentScore: persistedScore,
    lastUpdateMs,
    nowMs,
  });
  const nextScore = clampRiskScore(previousScore + Math.max(0, scoreAdded));

  return {
    previousScore,
    nextScore,
    riskLevel: getRiskLevel(nextScore),
  };
};

export const evaluateDetectionRule = async ({
  db,
  userId,
  eventType,
  occurredAtMs,
}: {
  db: Firestore;
  userId: string;
  eventType: SecurityEventType;
  occurredAtMs: number;
}) => {
  const matchedRule =
    DETECTION_RULES.find((rule) => rule.type === eventType) ?? null;

  if (!matchedRule || matchedRule.alwaysTrigger) {
    return resolveDetectionOutcome({ eventType });
  }

  if (!matchedRule.timeWindowMs || !matchedRule.countThreshold) {
    return resolveDetectionOutcome({ eventType });
  }

  const windowStart = new Date(occurredAtMs - matchedRule.timeWindowMs);
  const snapshot = await db
    .collection(`users/${userId}/securityLogs`)
    .where("eventType", "==", eventType)
    .where("occurredAt", ">=", windowStart)
    .count()
    .get();

  return resolveDetectionOutcome({
    eventType,
    eventCountInWindow: snapshot.data().count,
  });
};
