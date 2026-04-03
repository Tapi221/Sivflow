import { describe, expect, it } from "vitest";

import {
  computeNextReview,
  createReviewLogEntry,
  ratingToSubjectiveScore,
} from "@/services/reviewAlgorithm";
import { calculateResistanceScore } from "@/utils/reviewMetrics";

describe("reviewAlgorithm initial resistance", () => {
  it("does not pin every first review to the same one-day interval", () => {
    const now = new Date("2026-03-26T12:00:00.000Z");
    const newCard = {
      memoryStability: 0,
      reviewCount: 0,
      reviewLogs: [],
    };

    const results = ([1, 2, 3, 4] as const).map((rating) => {
      const reviewUpdate = computeNextReview({
        card: newCard,
        subjectiveScore: ratingToSubjectiveScore(rating),
        now,
      });
      const reviewLog = createReviewLogEntry({
        reviewedAt: now,
        rating,
        intervalDays: reviewUpdate.intervalDays,
      });

      return {
        intervalDays: reviewUpdate.intervalDays,
        resistanceScore: reviewLog.resistanceScore,
      };
    });

    expect(new Set(results.map((result) => result.intervalDays)).size).toBe(4);
    expect(results.map((result) => result.resistanceScore)).not.toEqual([
      15, 15, 15, 15,
    ]);
    expect(results[0].intervalDays).toBeLessThan(results[3].intervalDays);
  });

  it("keeps logged resistance scores aligned with the interval-to-score mapping", () => {
    const now = new Date("2026-03-26T12:00:00.000Z");
    const reviewUpdate = computeNextReview({
      card: {
        memoryStability: 0,
        reviewCount: 0,
        reviewLogs: [],
      },
      subjectiveScore: ratingToSubjectiveScore(3),
      now,
    });

    const reviewLog = createReviewLogEntry({
      reviewedAt: now,
      rating: 3,
      intervalDays: reviewUpdate.intervalDays,
    });

    expect(reviewLog.resistanceScore).toBe(
      calculateResistanceScore(reviewUpdate.intervalDays),
    );
  });
});

