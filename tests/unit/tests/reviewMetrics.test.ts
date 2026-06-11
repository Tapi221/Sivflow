import { calculateResistanceScore, calculateRetentionProbability } from "@/utils/reviewMetrics";
import { getStabilityPhase } from "@/utils/reviewUtils";

describe("復習メトリクス", () => {
  test("安定度が固定なら間隔が長いほど保持確率は下がる", () => {
    const S = 0.5;

    const ret1 = calculateRetentionProbability(S, 1);
    const ret10 = calculateRetentionProbability(S, 10);
    const ret30 = calculateRetentionProbability(S, 30);

    console.log(
      `保持確率 S=0.5: 1日=${ret1}%, 10日=${ret10}%, 30日=${ret30}%`,
    );

    expect(ret1).toBeGreaterThan(ret10);
    expect(ret10).toBeGreaterThan(ret30);
  });

  test("間隔が長いほど耐性スコアは上がる", () => {
    const res1 = calculateResistanceScore(1);
    const res10 = calculateResistanceScore(10);
    const res90 = calculateResistanceScore(90);

    console.log(`耐性: 1日=${res1}, 10日=${res10}, 90日=${res90}`);

    expect(res10).toBeGreaterThan(res1);
    expect(res90).toBeGreaterThan(res10);
    expect(res90).toBe(100);
  });

  test("耐性スコアの境界値と代表値を確認する", () => {
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

  test("安定度フェーズは保持確率に基づいて分類される", () => {
    const S = 1.0;

    const phaseShort = getStabilityPhase(S, 1);
    expect(phaseShort.key).toBe("solid");

    const phaseLong = getStabilityPhase(S, 120);
    expect(phaseLong.key).toBe("fragile");

    console.log(
      `フェーズ S=1.0: 1日=${phaseShort.label}, 120日=${phaseLong.label}`,
    );
  });
});
