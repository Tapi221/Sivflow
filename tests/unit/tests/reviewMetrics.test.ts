import {
  calculateResistanceScore,
  calculateRetentionProbability,
} from "@/utils/reviewMetrics";
import { getStabilityPhase } from "@/utils/reviewUtils";

describe("Review Metrics", () => {
  test("Retention Probability decreases as Interval increases (for fixed S)", () => {
    const S = 0.5;

    const ret1 = calculateRetentionProbability(S, 1);
    const ret10 = calculateRetentionProbability(S, 10);
    const ret30 = calculateRetentionProbability(S, 30);

    console.log(
      `Retention S=0.5: 1day=${ret1}%, 10days=${ret10}%, 30days=${ret30}%`,
    );

    expect(ret1).toBeGreaterThan(ret10);
    expect(ret10).toBeGreaterThan(ret30);
  });

  test("Resistance Score increases as Interval increases", () => {
    const res1 = calculateResistanceScore(1);
    const res10 = calculateResistanceScore(10);
    const res90 = calculateResistanceScore(90);

    console.log(`Resistance: 1day=${res1}, 10days=${res10}, 90days=${res90}`);

    expect(res10).toBeGreaterThan(res1);
    expect(res90).toBeGreaterThan(res10);
    expect(res90).toBe(100);
  });

  test("Resistance boundary and representative values", () => {
    expect(calculateResistanceScore(0)).toBe(0);
    expect(calculateResistanceScore(-5)).toBe(0);

    expect(calculateResistanceScore(90)).toBe(100);

    const r1 = calculateResistanceScore(1);
    const r7 = calculateResistanceScore(7);
    const r30 = calculateResistanceScore(30);

    expect(r1).toBeGreaterThanOrEqual(14);
    expect(r1).toBeLessThanOrEqual(16);

    expect(r7).toBeGreaterThanOrEqual(44);
    expect(r7).toBeLessThanOrEqual(48);

    expect(r30).toBeGreaterThanOrEqual(74);
    expect(r30).toBeLessThanOrEqual(78);
  });

  test("Stability Phase classifies based on Retention Probability", () => {
    const S = 1.0;

    const phaseShort = getStabilityPhase(S, 1);
    expect(phaseShort.key).toBe("solid");

    const phaseLong = getStabilityPhase(S, 120);
    expect(phaseLong.key).toBe("fragile");

    console.log(
      `Phase S=1.0: 1day=${phaseShort.label}, 120days=${phaseLong.label}`,
    );
  });
});
