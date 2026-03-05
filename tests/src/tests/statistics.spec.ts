import { isReviewed, calculateAverageStability } from "../utils/statistics";
import { normalizeMemoryStability } from "../utils/reviewUtils";
import assert from "assert";

// Mock Card type for testing
type MockCard = {
  reviewCount?: number;
  memoryStability?: number;
  lastReviewAt?: Date;
  [key: string]: unknown;
};

console.log("Running Statistics Logic Tests...");

let passed = 0;
let failed = 0;

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (e: unknown) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(e.message);
    failed++;
  }
};

// Scenario 1: Unreviewed card (reviewCount = 0)
test("isReviewed returns false for reviewCount 0", () => {
  const card: MockCard = { reviewCount: 0, memoryStability: 0.3 };
  assert.strictEqual(isReviewed(card), false);
});

// Scenario 2: Reviewed card (reviewCount > 0)
test("isReviewed returns true for reviewCount > 0", () => {
  const card: MockCard = { reviewCount: 1, memoryStability: 0.3 };
  assert.strictEqual(isReviewed(card), true);
});

// Scenario 3: Corrupted/Migrated card (lastReviewAt exists, but reviewCount 0)
// This verifies the strict "ignore lastReviewAt" rule
test("isReviewed returns false even if lastReviewAt exists (if reviewCount is 0)", () => {
  const card: MockCard = {
    reviewCount: 0,
    lastReviewAt: new Date(),
    memoryStability: 0.5,
  };
  assert.strictEqual(isReviewed(card), false);
});

// Scenario 4: Calculate Average - No Reviewed Cards
test("calculateAverageStability returns null when no cards are reviewed", () => {
  const cards: MockCard[] = [
    { reviewCount: 0, memoryStability: 0 },
    { reviewCount: 0, memoryStability: 0.5 }, // Should be ignored
  ];
  assert.strictEqual(calculateAverageStability(cards), null);
});

// Scenario 5: Calculate Average - Mixed Cards
test("calculateAverageStability calculates average of reviewed cards ONLY", () => {
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
  assert.ok(Math.abs(result - 0.6) < 0.0001, `Expected 0.6, got ${result}`);
});

// Scenario 6: Calculate Average - Single Reviewed Card
test("calculateAverageStability returns exact stability for single card", () => {
  const cards: MockCard[] = [{ reviewCount: 5, memoryStability: 0.75 }];
  assert.strictEqual(calculateAverageStability(cards), 0.75);
});

// Summary
console.log("---------------------------------------------------");
console.log(`Tests Completed: ${passed} Passed, ${failed} Failed`);

if (failed > 0) {
  process.exit(1);
}
