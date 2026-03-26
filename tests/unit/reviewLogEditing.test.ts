import { describe, expect, it } from "vitest";

import {
  createLatestReviewLogPatch,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";

const createdAt = new Date("2026-03-20T03:00:00.000Z");
const firstReviewedAt = new Date("2026-03-21T09:15:00.000Z");
const secondReviewedAt = new Date("2026-03-24T10:45:00.000Z");

const createInitialCard = () => ({
  createdAt,
  memoryStability: 0,
  nextReviewDate: new Date("2026-03-21T00:00:00.000Z"),
  reviewCount: 0,
  reviewLogs: [],
});

const createReviewedCard = () => {
  const initialCard = createInitialCard();
  const first = createReviewPatchFromRating({
    card: initialCard,
    rating: 3,
    now: firstReviewedAt,
  });
  const afterFirst = { ...initialCard, ...first.patch };
  const second = createReviewPatchFromRating({
    card: afterFirst,
    rating: 4,
    now: secondReviewedAt,
  });
  const afterSecond = { ...afterFirst, ...second.patch };

  return {
    afterFirst,
    afterSecond,
  };
};

describe("latest review log editing", () => {
  it("recomputes the latest resistance score from the updated rating", () => {
    const { afterFirst, afterSecond } = createReviewedCard();
    const expected = createReviewPatchFromRating({
      card: afterFirst,
      rating: 1,
      now: secondReviewedAt,
    });

    const { patch } = createLatestReviewLogPatch({
      action: "update",
      card: afterSecond,
      rating: 1,
      reviewedAt: secondReviewedAt,
      reviewLogs: afterSecond.reviewLogs,
    });

    expect(patch.reviewCount).toBe(expected.patch.reviewCount);
    expect(patch.lastSubjectiveScore).toBe(expected.patch.lastSubjectiveScore);
    expect(patch.memoryStability).toBeCloseTo(
      expected.patch.memoryStability,
      10,
    );
    expect((patch.nextReviewDate as Date).toISOString()).toBe(
      expected.patch.nextReviewDate.toISOString(),
    );
    expect(patch.reviewLogs).toEqual(expected.patch.reviewLogs);
  });

  it("rolls the card back to the previous review when deleting the latest log", () => {
    const { afterFirst, afterSecond } = createReviewedCard();

    const { patch } = createLatestReviewLogPatch({
      action: "delete",
      card: afterSecond,
      reviewLogs: afterSecond.reviewLogs,
    });

    expect(patch.reviewCount).toBe(afterFirst.reviewCount);
    expect((patch.lastReviewAt as Date).toISOString()).toBe(
      (afterFirst.lastReviewAt as Date).toISOString(),
    );
    expect(patch.lastSubjectiveScore).toBe(afterFirst.lastSubjectiveScore);
    expect(patch.memoryStability).toBeCloseTo(afterFirst.memoryStability, 10);
    expect((patch.nextReviewDate as Date).toISOString()).toBe(
      (afterFirst.nextReviewDate as Date).toISOString(),
    );
    expect(patch.reviewLogs).toEqual(afterFirst.reviewLogs);
  });
});
