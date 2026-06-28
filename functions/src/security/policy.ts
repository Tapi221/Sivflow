import type { SecurityEventType } from "#src/security/contract.js";

type SecurityRiskLevel = "normal" | "warning" | "high" | "critical";
type DetectionOutcome = {
  triggered: boolean;
  scoreAdded: number;
};
type RiskScoreCalculation = {
  previousScore: number;
  nextScore: number;
  riskLevel: SecurityRiskLevel;
};

const RISK_SCORE_THRESHOLDS = { warning: 30, require2FA: 70, accountLock: 100, } as const;
const SECURITY_EVENT_SCORE: Partial<Record<SecurityEventType, number>> = {
  ACCESS_DENIED_REVOKED: 30,
  SENSITIVE_OP_REVOKED: 15,
  DEVICE_REVOKED: 10,
  SYNC_AUTH_ERROR: 8,
  LOCK_CONTENTION_EXCESS: 20,
  SYNC_CONFLICT_EXCESS: 3,
  ADMIN_DEVICE_REVOKE: 10,
  ADMIN_ACCOUNT_LOCK: 100,
} as const;
const WINDOWED_EVENT_THRESHOLDS: Partial<Record<SecurityEventType, number>> = {
  SYNC_CONFLICT_EXCESS: 10,
  LOCK_CONTENTION_EXCESS: 5,
} as const;
const RISK_DECAY_PER_HOUR = 3;

const clampRiskScore = (score: number): number => Math.max(0, Math.min(RISK_SCORE_THRESHOLDS.accountLock, Math.round(score)));
const getRiskLevel = (score: number): SecurityRiskLevel => {
  if (score >= RISK_SCORE_THRESHOLDS.accountLock) return "critical";
  if (score >= RISK_SCORE_THRESHOLDS.require2FA) return "high";
  if (score >= RISK_SCORE_THRESHOLDS.warning) return "warning";
  return "normal";
};
const resolveDetectionOutcome = ({ eventType, eventCountInWindow = 1, }: { eventType: SecurityEventType;
  eventCountInWindow?: number;
}): DetectionOutcome => {
  const threshold = WINDOWED_EVENT_THRESHOLDS[eventType];
  if (threshold !== undefined && eventCountInWindow < threshold) return { triggered: false, scoreAdded: 0 };

  const scoreAdded = SECURITY_EVENT_SCORE[eventType] ?? 0;
  return { triggered: scoreAdded > 0, scoreAdded };
};
const applyRiskDecay = ({ currentScore, lastUpdateMs, nowMs, }: { currentScore: number;
  lastUpdateMs: number;
  nowMs: number;
}): number => {
  const elapsedHours = Math.max(0, Math.floor((nowMs - lastUpdateMs) / (60 * 60 * 1000)));
  return clampRiskScore(currentScore - elapsedHours * RISK_DECAY_PER_HOUR);
};
const calculateNextRiskScore = ({ persistedScore, lastUpdateMs, nowMs, scoreAdded, }: { persistedScore: number;
  lastUpdateMs: number;
  nowMs: number;
  scoreAdded: number;
}): RiskScoreCalculation => {
  const previousScore = applyRiskDecay({ currentScore: persistedScore, lastUpdateMs, nowMs });
  const nextScore = clampRiskScore(previousScore + scoreAdded);

  return {
    previousScore,
    nextScore,
    riskLevel: getRiskLevel(nextScore),
  };
};

export { RISK_SCORE_THRESHOLDS, getRiskLevel, resolveDetectionOutcome, applyRiskDecay, calculateNextRiskScore };

export type { SecurityRiskLevel, DetectionOutcome, RiskScoreCalculation };
