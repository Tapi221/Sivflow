import { describe, expect, it } from "vitest";

import {
  INITIAL_REVIEW_INTERVAL_DAYS,
  computeNextReview,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";
import { calculateResistanceScore } from "@/utils/reviewMetrics";

const now = new Date("2026-03-26T13:33:00.000Z");

describe("reviewAlgorithm", () => {
  it("keeps the first review interval identical across all subjective scores", () => {
    const card = {
      memoryStability: 0,
      nextReviewDate: new Date("2026-03-26T00:00:00.000Z"),
      reviewCount: 0,
    };

    const intervals = ([0, 1, 2, 3] as const).map(
      (subjectiveScore) =>
        computeNextReview({
          card,
          subjectiveScore,
          now,
        }).intervalDays,
    );

    expect(new Set(intervals).size).toBe(1);
    expect(intervals[0]).toBe(INITIAL_REVIEW_INTERVAL_DAYS);
  });

  it("uses the computed interval when creating a persisted review patch", () => {
    const card = {
      memoryStability: 0,
      nextReviewDate: new Date("2026-03-26T00:00:00.000Z"),
      reviewCount: 0,
      reviewLogs: [],
    };

    const { patch, reviewLog } = createReviewPatchFromRating({
      card,
      rating: 4,
      now,
    });

    expect(patch.reviewCount).toBe(1);
    expect(patch.lastSubjectiveScore).toBe(3);
    expect(patch.reviewLogs).toHaveLength(1);
    expect(patch.reviewLogs[0]).toEqual(reviewLog);
    expect(reviewLog.resistanceScore).toBe(
      calculateResistanceScore(INITIAL_REVIEW_INTERVAL_DAYS),
    );
  });

  it("still changes intervals by score after the first review", () => {
    const card = {
      memoryStability: 0.35,
      nextReviewDate: new Date("2026-03-26T00:00:00.000Z"),
      lastReviewAt: new Date("2026-03-20T00:00:00.000Z"),
      reviewCount: 2,
    };

    const forgot = computeNextReview({
      card,
      subjectiveScore: 0,
      now,
    });
    const easy = computeNextReview({
      card,
      subjectiveScore: 3,
      now,
    });

    expect(forgot.intervalDays).toBeLessThan(easy.intervalDays);
  });
});
