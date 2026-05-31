import { describe, expect, it } from "vitest";
import { computeNextReview, createReviewPatchFromRating } from "@/services/reviewAlgorithm";
import { calculateResistanceScore } from "@/utils/reviewMetrics";

const now = new Date("2026-03-26T13:33:00.000Z");

describe("reviewAlgorithm", () => {
  it("初回レビュー間隔を主観スコアに応じて変化させる", () => {
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

    expect(new Set(intervals).size).toBe(intervals.length);
    expect(intervals).toEqual([2, 3, 8, 15]);
  });

  it("永続化用レビュー patch 作成時に計算済み間隔を使用する", () => {
    const card = {
      memoryStability: 0,
      nextReviewDate: new Date("2026-03-26T00:00:00.000Z"),
      reviewCount: 0,
      reviewLogs: [],
    };

    const { patch, reviewLog, reviewUpdate } = createReviewPatchFromRating({
      card,
      rating: 4,
      now,
    });

    expect(patch.reviewCount).toBe(1);
    expect(patch.lastSubjectiveScore).toBe(3);
    expect(patch.reviewLogs).toHaveLength(1);
    expect(patch.reviewLogs[0]).toEqual(reviewLog);
    expect(reviewLog.resistanceScore).toBe(
      calculateResistanceScore(reviewUpdate.intervalDays),
    );
  });

  it("初回以降もスコアに応じて間隔を変化させる", () => {
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
