import assert from "assert";
import { calculateAverageStability, isReviewed } from "../utils/statistics";

// Mock Card type for testing
type MockCard = {
  reviewCount?: number;
  memoryStability?: number;
  lastReviewAt?: Date;
  [key: string]: unknown;
};

console.log("統計ロジックのテストを実行中...");

let passed = 0;
let failed = 0;

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`✅ [成功] ${name}`);
    passed++;
  } catch (e: unknown) {
    console.error(`❌ [失敗] ${name}`);
    console.error(e.message);
    failed++;
  }
};

// Scenario 1: Unreviewed card (reviewCount = 0)
test("reviewCount が 0 の場合、isReviewed は false を返す", () => {
  const card: MockCard = { reviewCount: 0, memoryStability: 0.3 };
  assert.strictEqual(isReviewed(card), false);
});

// Scenario 2: Reviewed card (reviewCount > 0)
test("reviewCount が 0 より大きい場合、isReviewed は true を返す", () => {
  const card: MockCard = { reviewCount: 1, memoryStability: 0.3 };
  assert.strictEqual(isReviewed(card), true);
});

// Scenario 3: Corrupted/Migrated card (lastReviewAt exists, but reviewCount 0)
// This verifies the strict "ignore lastReviewAt" rule
test("lastReviewAt が存在しても reviewCount が 0 なら isReviewed は false を返す", () => {
  const card: MockCard = {
    reviewCount: 0,
    lastReviewAt: new Date(),
    memoryStability: 0.5,
  };
  assert.strictEqual(isReviewed(card), false);
});

// Scenario 4: Calculate Average - No Reviewed Cards
test("レビュー済みカードがない場合、calculateAverageStability は null を返す", () => {
  const cards: MockCard[] = [
    { reviewCount: 0, memoryStability: 0 },
    { reviewCount: 0, memoryStability: 0.5 }, // Should be ignored
  ];
  assert.strictEqual(calculateAverageStability(cards), null);
});

// Scenario 5: Calculate Average - Mixed Cards
test("calculateAverageStability はレビュー済みカードだけで平均を計算する", () => {
  const cards: MockCard[] = [
    { reviewCount: 1, memoryStability: 0.8 }, // 80%
    { reviewCount: 2, memoryStability: 0.4 }, // 40%
    { reviewCount: 0, memoryStability: 0.1 }, // Should be ignored
  ];
  // Expected: (0.8 + 0.4) / 2 = 0.6

  // Note: normalizeMemoryStability might clamp or adjust slightly,
  // so we check if result is close to what we expect given the util usage.
  // Expect approx 0.6. Use epsilon for floating point comparison.
  const result = calculateAverageStability(cards) as number;
  assert.ok(Math.abs(result - 0.6) < 0.0001, `期待値 0.6、実際の値 ${result}`);
});

// Scenario 6: Calculate Average - Single Reviewed Card
test("レビュー済みカードが 1 枚だけの場合、calculateAverageStability はその安定度を返す", () => {
  const cards: MockCard[] = [{ reviewCount: 5, memoryStability: 0.75 }];
  assert.strictEqual(calculateAverageStability(cards), 0.75);
});

// Summary
console.log("---------------------------------------------------");
console.log(`テスト完了: 成功 ${passed} 件、失敗 ${failed} 件`);

if (failed > 0) {
  process.exit(1);
}
