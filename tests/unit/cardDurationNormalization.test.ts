import { describe, expect, it } from "vitest";

import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";

describe("normalizeCard durationMinutes", () => {
  it("normalizes empty-string durationMinutes to null", () => {
    const rawCard = {
      id: "duration-empty-card",
      reviewLogs: [
        {
          reviewedAt: "2026-03-28T07:00:00.000Z",
          rating: 3,
          durationMinutes: "",
        },
      ],
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.reviewLogs[0]?.durationMinutes).toBeNull();
  });

  it("maps subjectiveScore-based logs to rating scale", () => {
    const rawCard = {
      id: "duration-subjective-score-card",
      reviewLogs: [
        {
          reviewedAt: "2026-03-28T07:00:00.000Z",
          subjectiveScore: 0,
          resistanceScore: 6,
        },
        {
          reviewedAt: "2026-03-28T08:00:00.000Z",
          last_subjective_score: 3,
          resistanceScore: 12,
        },
      ],
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.reviewLogs).toHaveLength(2);
    expect(normalized.reviewLogs[0]?.rating).toBe(1);
    expect(normalized.reviewLogs[1]?.rating).toBe(4);
  });
});
