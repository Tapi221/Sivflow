const RISK_SCORE_THRESHOLDS = { warning: 30, require2FA: 70, accountLock: 100, };
const SECURITY_EVENT_SCORE = {
    ACCESS_DENIED_REVOKED: 30,
    SENSITIVE_OP_REVOKED: 15,
    DEVICE_REVOKED: 10,
    SYNC_AUTH_ERROR: 8,
    LOCK_CONTENTION_EXCESS: 20,
    SYNC_CONFLICT_EXCESS: 3,
    ADMIN_DEVICE_REVOKE: 10,
    ADMIN_ACCOUNT_LOCK: 100,
};
const WINDOWED_EVENT_THRESHOLDS = {
    SYNC_CONFLICT_EXCESS: 10,
    LOCK_CONTENTION_EXCESS: 5,
};
const RISK_DECAY_PER_HOUR = 3;
const clampRiskScore = (score) => Math.max(0, Math.min(RISK_SCORE_THRESHOLDS.accountLock, Math.round(score)));
const getRiskLevel = (score) => {
    if (score >= RISK_SCORE_THRESHOLDS.accountLock)
        return "critical";
    if (score >= RISK_SCORE_THRESHOLDS.require2FA)
        return "high";
    if (score >= RISK_SCORE_THRESHOLDS.warning)
        return "warning";
    return "normal";
};
const resolveDetectionOutcome = ({ eventType, eventCountInWindow = 1, }) => {
    const threshold = WINDOWED_EVENT_THRESHOLDS[eventType];
    if (threshold !== undefined && eventCountInWindow < threshold)
        return { triggered: false, scoreAdded: 0 };
    const scoreAdded = SECURITY_EVENT_SCORE[eventType] ?? 0;
    return { triggered: scoreAdded > 0, scoreAdded };
};
const applyRiskDecay = ({ currentScore, lastUpdateMs, nowMs, }) => {
    const elapsedHours = Math.max(0, Math.floor((nowMs - lastUpdateMs) / (60 * 60 * 1000)));
    return clampRiskScore(currentScore - elapsedHours * RISK_DECAY_PER_HOUR);
};
const calculateNextRiskScore = ({ persistedScore, lastUpdateMs, nowMs, scoreAdded, }) => {
    const previousScore = applyRiskDecay({ currentScore: persistedScore, lastUpdateMs, nowMs });
    const nextScore = clampRiskScore(previousScore + scoreAdded);
    return {
        previousScore,
        nextScore,
        riskLevel: getRiskLevel(nextScore),
    };
};
export { RISK_SCORE_THRESHOLDS, getRiskLevel, resolveDetectionOutcome, applyRiskDecay, calculateNextRiskScore };
