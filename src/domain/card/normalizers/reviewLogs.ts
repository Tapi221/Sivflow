import { normalizeDate } from "@/utils/codec/date";
import { asRecord, pick } from "@/utils/records";



type NormalizedReviewLog = {
  reviewedAt: string;
  rating: 1 | 2 | 3 | 4;
  resistanceScore: number;
  durationMinutes: number | null;
};



const pickNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
};
const clampRating = (value: number): 1 | 2 | 3 | 4 | null => {
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 4) return null;
  return rounded as 1 | 2 | 3 | 4;
};
const subjectiveScoreToRating = (value: number): 1 | 2 | 3 | 4 | null => {
  const rounded = Math.round(value);
  if (rounded >= 0 && rounded <= 3) {
    return (rounded + 1) as 1 | 2 | 3 | 4;
  }

  return clampRating(rounded);
};
const normalizeReviewLogs = (rawLogs: unknown): NormalizedReviewLog[] => {
  if (!Array.isArray(rawLogs)) return [];

  return rawLogs
    .map((item): NormalizedReviewLog | null => {
      const log = asRecord(item);
      if (!log) return null;

      const reviewedAt = normalizeDate(pick(log.reviewedAt, log.reviewed_at));
      if (!reviewedAt) return null;

      const directRatingRaw = pickNumber(
        pick(log.rating, log.ratingNum, log.rating_num),
      );
      const subjectiveScoreRaw = pickNumber(
        pick(log.subjectiveScore, log.subjective_score),
      );
      const lastSubjectiveScoreRaw = pickNumber(
        pick(log.lastSubjectiveScore, log.last_subjective_score),
      );

      const rating =
        (directRatingRaw === null ? null : clampRating(directRatingRaw)) ??
        (subjectiveScoreRaw === null
          ? null
          : subjectiveScoreToRating(subjectiveScoreRaw)) ??
        (lastSubjectiveScoreRaw === null
          ? null
          : subjectiveScoreToRating(lastSubjectiveScoreRaw));

      if (rating === null) return null;

      const resistanceScore =
        pickNumber(
          pick(
            log.resistanceScore,
            log.resistance_score,
            log.endurance,
            log.endurance_score,
          ),
        ) ?? 0;

      const durationMinutes = pickNumber(
        pick(
          log.durationMinutes,
          log.duration_minutes,
          log.durationMin,
          log.duration_min,
        ),
      );

      return {
        reviewedAt: reviewedAt.toISOString(),
        rating,
        resistanceScore,
        durationMinutes,
      };
    })
    .filter((value): value is NormalizedReviewLog => value !== null);
};



export { normalizeReviewLogs };


export type { NormalizedReviewLog };
