import { describe, expect, it } from "vitest";

import {
  isSupportedSecurityEventType,
  SECURITY_EVENT_TYPES,
} from "../../../functions/src/security/contract";
import {
  applyRiskDecay,
  calculateNextRiskScore,
  getRiskLevel,
  resolveDetectionOutcome,
  RISK_SCORE_THRESHOLDS,
} from "../../../functions/src/security/policy";

describe("security policy", () => {
  it("exposes a single authoritative set of security event types", () => {
    expect(SECURITY_EVENT_TYPES).toContain("ACCESS_DENIED_REVOKED");
    expect(SECURITY_EVENT_TYPES).toContain("ADMIN_LOG_EXPORT");
    expect(isSupportedSecurityEventType("LOGIN_FAILED")).toBe(true);
    expect(isSupportedSecurityEventType("NOT_A_REAL_EVENT")).toBe(false);
  });

  it("windowed rule does not add score before threshold", () => {
    const outcome = resolveDetectionOutcome({
      eventType: "SYNC_CONFLICT_EXCESS",
      eventCountInWindow: 9,
    });

    expect(outcome.triggered).toBe(false);
    expect(outcome.scoreAdded).toBe(0);
  });

  it("windowed rule adds score at threshold", () => {
    const outcome = resolveDetectionOutcome({
      eventType: "SYNC_CONFLICT_EXCESS",
      eventCountInWindow: 10,
    });

    expect(outcome.triggered).toBe(true);
    expect(outcome.scoreAdded).toBe(3);
  });

  it("always-trigger rule adds score immediately", () => {
    const outcome = resolveDetectionOutcome({
      eventType: "ACCESS_DENIED_REVOKED",
    });

    expect(outcome.triggered).toBe(true);
    expect(outcome.scoreAdded).toBe(30);
  });

  it("applies decay before score addition", () => {
    const decayedScore = applyRiskDecay({
      currentScore: 55,
      lastUpdateMs: 0,
      nowMs: 2 * 60 * 60 * 1000,
    });

    expect(decayedScore).toBe(49);
  });

  it("calculates next score from decayed base score", () => {
    const result = calculateNextRiskScore({
      persistedScore: 49,
      lastUpdateMs: 0,
      nowMs: 0,
      scoreAdded: 30,
    });

    expect(result.previousScore).toBe(49);
    expect(result.nextScore).toBe(79);
    expect(result.riskLevel).toBe("high");
  });

  it("resolves risk level thresholds deterministically", () => {
    expect(getRiskLevel(0)).toBe("normal");
    expect(getRiskLevel(RISK_SCORE_THRESHOLDS.warning)).toBe("warning");
    expect(getRiskLevel(RISK_SCORE_THRESHOLDS.require2FA)).toBe("high");
    expect(getRiskLevel(RISK_SCORE_THRESHOLDS.accountLock)).toBe("critical");
  });
});
