import type { Timestamp } from "firebase/firestore";
import type { ReviewLog } from "@/types/domain/base";
import { normalizeDate as toDate } from "@/utils/codec/date";
import { calculateResistanceScore } from "@/utils/reviewMetrics";
import type { SubjectiveScore } from "@/utils/reviewUtils";
import { toMillis } from "@/utils/toMillis";



type ReviewAlgorithmInput = {
  card: {
    memoryStability?: number | null;
    currentLevel?: number | null;
    level?: number | null;
    nextReviewDate?: Date | Timestamp | null;
    next_review_date?: Date | Timestamp | string | number | null;
    lastReviewAt?: Date | Timestamp | null;
    recoveryRemaining?: number | null;
    reviewCount?: number | null;
    difficulty?: number | null;
  };
  subjectiveScore: SubjectiveScore;
  now?: Date;
};
type ReviewAlgorithmResult = {
  memoryStability: number;
  nextReviewDate: Date;
  lastReviewAt: Date;
  lastSubjectiveScore: SubjectiveScore;
  recoveryRemaining: number;
  intervalDays: number;
  delayDays: number;
  reviewCount: number;
  difficulty: number;
};
type MultipleChoiceConfidence = "high" | "mid" | "luck";
type MultipleChoiceReviewMeta = {
  isCorrect: boolean;
  isUnknown?: boolean;
  confidence?: MultipleChoiceConfidence;
  choiceTimeMs?: number;
};
type ReviewHistoryCard = ReviewAlgorithmInput["card"] & {
  createdAt?: Date | Timestamp | null;
  created_at?: Date | Timestamp | string | number | null;
  reviewLogs?: ReviewLog[] | null;
};
type LatestReviewLogPatchParams =
  | {
    action: "update";
    card: ReviewHistoryCard;
    delayBonusEnabled?: boolean;
    reviewLogs?: ReviewLog[] | null;
    reviewStartNextDay?: boolean;
    reviewedAt: Date;
    rating: ReviewLog["rating"];
    durationMinutes?: number | null;
  }
  | {
    action: "delete";
    card: ReviewHistoryCard;
    delayBonusEnabled?: boolean;
    reviewLogs?: ReviewLog[] | null;
    reviewStartNextDay?: boolean;
  };



const MIN_STABILITY = 0.01;
const MAX_STABILITY = 1;
const MAX_INTERVAL_DAYS = 90;
const INITIAL_REVIEW_INTERVAL_DAYS = 1;
const MIN_DIFFICULTY = 0;
const MAX_DIFFICULTY = 1;
const DIFFICULTY_ALPHA = 0.1;
const DIFFICULTY_INTERVAL_BRAKE = 0.3;



const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const readNumber = (value: Record<string, unknown>, key: string): number | null => {
  const candidate = value[key];
  if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  if (typeof candidate === "string") {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
const readArray = (value: Record<string, unknown>, key: string): unknown[] => {
  const candidate = value[key];
  return Array.isArray(candidate) ? candidate : [];
};
const diffDays = (a: Date, b: Date): number => {
  const msA = new Date(a).setHours(0, 0, 0, 0);
  const msB = new Date(b).setHours(0, 0, 0, 0);
  return Math.floor((msA - msB) / (1000 * 60 * 60 * 24));
};
const normalizeReviewCount = (value: unknown): number => {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.trunc(numeric));
};
const getStoredReviewLogCount = (card: ReviewAlgorithmInput["card"]): number => {
  const record = isRecord(card) ? card : {};
  const reviewLogs = readArray(record, "reviewLogs").length > 0 ? readArray(record, "reviewLogs") : readArray(record, "review_logs");
  return reviewLogs.length;
};
const getCurrentReviewCount = (card: ReviewAlgorithmInput["card"]): number => {
  const record = isRecord(card) ? card : {};
  const legacyCount = readNumber(record, "review_count");
  return Math.max(normalizeReviewCount(card.reviewCount ?? legacyCount ?? 0), getStoredReviewLogCount(card));
};
const clampStability = (value: number): number => Math.max(MIN_STABILITY, Math.min(MAX_STABILITY, value));
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const clampDifficulty = (value: number): number => Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, value));
const legacyLevelToStability = (level: number): number => clampStability(0.1 + (Math.min(5, Math.max(0, level)) / 5) * 0.8);
const getInitialStability = (memoryStability?: number | null, legacyLevel?: number | null): number => {
  if (typeof memoryStability === "number" && Number.isFinite(memoryStability)) {
    if (memoryStability > 0 && memoryStability <= 1) return clampStability(memoryStability);
    if (memoryStability > 1 && memoryStability <= 100) return clampStability((memoryStability - 5) / 95);
  }
  if (typeof legacyLevel === "number" && Number.isFinite(legacyLevel)) return legacyLevelToStability(legacyLevel);
  return 0.3;
};
const getInitialDifficulty = (difficulty?: number | null, stability?: number | null): number => {
  if (typeof difficulty === "number" && Number.isFinite(difficulty)) return clampDifficulty(difficulty);
  if (typeof stability === "number" && Number.isFinite(stability)) return clampDifficulty((1 - clamp01(stability)) * 0.6);
  return 0.35;
};
const calculateIntervalDays = (stability: number): number => {
  const days = 1 + 100 * Math.pow(stability, 2.5);
  return Math.max(1, Math.min(MAX_INTERVAL_DAYS, Math.round(days)));
};
const updateStability = (currentStability: number, score: SubjectiveScore): number => {
  let nextStability = currentStability;
  switch (score) {
    case 0:
      nextStability = currentStability * 0.5;
      break;
    case 1:
      nextStability = currentStability * 0.8;
      break;
    case 2:
      nextStability = currentStability + (1 - currentStability) * 0.1;
      break;
    case 3:
      nextStability = currentStability + (1 - currentStability) * 0.25;
      break;
  }
  return clampStability(nextStability);
};
const scoreToFailish = (score: SubjectiveScore): number => {
  switch (score) {
    case 0:
      return 1;
    case 1:
      return 0.6;
    case 2:
      return 0.2;
    case 3:
      return 0;
    default:
      return 0.2;
  }
};
const updateDifficulty = (currentDifficulty: number, score: SubjectiveScore): number => {
  const failish = scoreToFailish(score);
  return clampDifficulty(currentDifficulty * (1 - DIFFICULTY_ALPHA) + failish * DIFFICULTY_ALPHA);
};
const applyDifficultyBrakeToInterval = (baseIntervalDays: number, difficulty: number): number => {
  const factor = 1 - DIFFICULTY_INTERVAL_BRAKE * clampDifficulty(difficulty);
  return Math.max(1, Math.min(MAX_INTERVAL_DAYS, Math.round(baseIntervalDays * factor)));
};
const invertUpdatedStability = (currentStability: number, score: SubjectiveScore): number => {
  switch (score) {
    case 0:
      return clampStability(currentStability / 0.5);
    case 1:
      return clampStability(currentStability / 0.8);
    case 2:
      return clampStability((currentStability - 0.1) / 0.9);
    case 3:
      return clampStability((currentStability - 0.25) / 0.75);
    default:
      return clampStability(currentStability);
  }
};
const invertUpdatedDifficulty = (currentDifficulty: number, score: SubjectiveScore): number => {
  const failish = scoreToFailish(score);
  const denominator = 1 - DIFFICULTY_ALPHA;
  if (denominator <= 0) return clampDifficulty(currentDifficulty);
  return clampDifficulty((currentDifficulty - failish * DIFFICULTY_ALPHA) / denominator);
};
const calculateDelayBonusFactor = (delayDays: number): number => delayDays <= 0 ? 1 : 1 + Math.log2(1 + delayDays);
const estimateIntervalDaysFromResistanceScore = (resistanceScore: number): number => {
  const target = Math.max(0, Math.min(100, Math.round(resistanceScore)));
  let bestDays = INITIAL_REVIEW_INTERVAL_DAYS;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let days = 1; days <= MAX_INTERVAL_DAYS; days += 1) {
    const distance = Math.abs(calculateResistanceScore(days) - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDays = days;
    }
  }
  return bestDays;
};
const buildNextReviewDate = (reviewedAt: Date, intervalDays: number): Date => {
  const nextReviewDate = new Date(reviewedAt);
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
  nextReviewDate.setHours(0, 0, 0, 0);
  return nextReviewDate;
};
const estimateInitialNextReviewDate = ({ card, reviewStartNextDay }: { card: ReviewHistoryCard; reviewStartNextDay: boolean }): Date => {
  const record = isRecord(card) ? card : {};
  const createdAt = toDate(card.createdAt ?? (record["created_at"] as Date | Timestamp | string | number | null)) ?? new Date();
  const nextReviewDate = new Date(createdAt);
  if (reviewStartNextDay) nextReviewDate.setDate(nextReviewDate.getDate() + 1);
  nextReviewDate.setHours(0, 0, 0, 0);
  return nextReviewDate;
};
const computeNextReview = ({ card, subjectiveScore, now = new Date(), delayBonusEnabled = false }: ReviewAlgorithmInput & { delayBonusEnabled?: boolean }): ReviewAlgorithmResult => {
  const record = isRecord(card) ? card : {};
  const currentReviewCount = getCurrentReviewCount(card);
  const legacyLevel = card.currentLevel ?? readNumber(record, "current_level") ?? card.level ?? readNumber(record, "level");
  const currentStability = getInitialStability(card.memoryStability ?? readNumber(record, "memory_stability"), legacyLevel);
  const currentDifficulty = getInitialDifficulty(card.difficulty ?? readNumber(record, "difficulty"), currentStability);
  const plannedDate = toDate(card.nextReviewDate ?? (record["next_review_date"] as Date | Timestamp | string | number | null));
  const delayDays = Math.max(0, plannedDate ? diffDays(now, plannedDate) : 0);
  let newStability = updateStability(currentStability, subjectiveScore);
  if (delayBonusEnabled && delayDays > 0) {
    newStability = clampStability(newStability * (1 + Math.log2(1 + delayDays)));
  }
  const newDifficulty = updateDifficulty(currentDifficulty, subjectiveScore);
  const baseIntervalDays = calculateIntervalDays(newStability);
  const brakedInterval = applyDifficultyBrakeToInterval(baseIntervalDays, newDifficulty);
  const scoreMinInterval = subjectiveScore <= 0 ? 1 : subjectiveScore === 1 ? 2 : 1;
  const intervalDays = Math.max(scoreMinInterval, brakedInterval);
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
  nextReviewDate.setHours(0, 0, 0, 0);
  return {
    memoryStability: newStability,
    nextReviewDate,
    lastReviewAt: now,
    lastSubjectiveScore: subjectiveScore,
    recoveryRemaining: 0,
    intervalDays,
    delayDays,
    reviewCount: currentReviewCount + 1,
    difficulty: newDifficulty,
  };
};
const ratingToSubjectiveScore = (rating: ReviewLog["rating"]): SubjectiveScore => Math.max(0, Math.min(3, rating - 1)) as SubjectiveScore;
const buildCardStateBeforeLatestReview = ({ card, reviewLogs, delayBonusEnabled, reviewStartNextDay }: { card: ReviewHistoryCard; reviewLogs: ReviewLog[]; delayBonusEnabled: boolean; reviewStartNextDay: boolean }) => {
  if (reviewLogs.length === 0) throw new Error("最新の学習記録がありません");
  const previousLogs = reviewLogs.slice(0, -1);
  const latestLog = reviewLogs.at(-1)!;
  const previousLatestLog = previousLogs.at(-1) ?? null;
  const record = isRecord(card) ? card : {};
  const legacyLevel = card.currentLevel ?? readNumber(record, "current_level") ?? card.level ?? readNumber(record, "level");
  const latestReviewedAt = toDate(latestLog.reviewedAt) ?? new Date(latestLog.reviewedAt);
  const currentStability = getInitialStability(card.memoryStability ?? readNumber(record, "memory_stability"), legacyLevel);
  const currentDifficulty = getInitialDifficulty(card.difficulty ?? readNumber(record, "difficulty"), currentStability);
  const latestSubjectiveScore = ratingToSubjectiveScore(latestLog.rating);
  const previousNextReviewDate = previousLatestLog
    ? buildNextReviewDate(toDate(previousLatestLog.reviewedAt) ?? new Date(previousLatestLog.reviewedAt), estimateIntervalDaysFromResistanceScore(previousLatestLog.resistanceScore))
    : estimateInitialNextReviewDate({ card, reviewStartNextDay });
  const delayDays = delayBonusEnabled ? Math.max(0, diffDays(latestReviewedAt, previousNextReviewDate)) : 0;
  const stabilityBeforeDelayBonus = clampStability(currentStability / calculateDelayBonusFactor(delayDays));
  return {
    ...card,
    difficulty: invertUpdatedDifficulty(currentDifficulty, latestSubjectiveScore),
    lastReviewAt: previousLatestLog ? new Date(previousLatestLog.reviewedAt) : undefined,
    lastSubjectiveScore: previousLatestLog ? ratingToSubjectiveScore(previousLatestLog.rating) : undefined,
    memoryStability: invertUpdatedStability(stabilityBeforeDelayBonus, latestSubjectiveScore),
    nextReviewDate: previousNextReviewDate,
    recoveryRemaining: 0,
    reviewCount: previousLogs.length,
    reviewLogs: previousLogs,
  };
};
const createReviewLogEntry = ({ reviewedAt, rating, intervalDays, durationMinutes = null }: { reviewedAt: Date; rating: ReviewLog["rating"]; intervalDays: number; durationMinutes?: number | null }): ReviewLog => {
  return {
    reviewedAt: reviewedAt.toISOString(),
    rating,
    resistanceScore: calculateResistanceScore(intervalDays),
    durationMinutes: typeof durationMinutes === "number" && Number.isFinite(durationMinutes) ? Math.max(0, Math.round(durationMinutes)) : null,
  };
};
const createReviewPatchFromRating = ({ card, rating, now = new Date(), delayBonusEnabled = false, durationMinutes = null }: { card: ReviewAlgorithmInput["card"] & { reviewLogs?: ReviewLog[] | null }; rating: ReviewLog["rating"]; now?: Date; delayBonusEnabled?: boolean; durationMinutes?: number | null }) => {
  const subjectiveScore = ratingToSubjectiveScore(rating);
  const reviewUpdate = computeNextReview({ card, subjectiveScore, now, delayBonusEnabled });
  const reviewLog = createReviewLogEntry({ reviewedAt: now, rating, intervalDays: reviewUpdate.intervalDays, durationMinutes });
  return {
    subjectiveScore,
    reviewUpdate,
    reviewLog,
    patch: {
      ...reviewUpdate,
      reviewLogs: [...(card.reviewLogs ?? []), reviewLog],
    },
  };
};
const createLatestReviewLogPatch = (params: LatestReviewLogPatchParams) => {
  const reviewLogs = [...(params.reviewLogs ?? [])].sort((left, right) => toMillis(left.reviewedAt) - toMillis(right.reviewedAt));
  if (reviewLogs.length === 0) throw new Error("最新の学習記録がありません");
  const delayBonusEnabled = params.delayBonusEnabled ?? false;
  const reviewStartNextDay = params.reviewStartNextDay ?? true;
  const previousCard = buildCardStateBeforeLatestReview({ card: params.card, reviewLogs, delayBonusEnabled, reviewStartNextDay });
  if (params.action === "delete") {
    return {
      previousCard,
      patch: {
        difficulty: previousCard.difficulty,
        lastReviewAt: previousCard.lastReviewAt,
        lastSubjectiveScore: previousCard.lastSubjectiveScore,
        memoryStability: previousCard.memoryStability,
        nextReviewDate: previousCard.nextReviewDate,
        recoveryRemaining: previousCard.recoveryRemaining,
        reviewCount: previousCard.reviewCount,
        reviewLogs: previousCard.reviewLogs ?? [],
      },
      removedReviewLog: reviewLogs.at(-1)!,
    };
  }
  const reviewUpdate = computeNextReview({ card: previousCard, subjectiveScore: ratingToSubjectiveScore(params.rating), now: params.reviewedAt, delayBonusEnabled });
  const reviewLog = createReviewLogEntry({
    reviewedAt: params.reviewedAt,
    rating: params.rating,
    intervalDays: reviewUpdate.intervalDays,
    durationMinutes: params.durationMinutes ?? reviewLogs.at(-1)?.durationMinutes ?? null,
  });
  return {
    previousCard,
    reviewLog,
    reviewUpdate,
    patch: {
      ...reviewUpdate,
      reviewLogs: [...(previousCard.reviewLogs ?? []), reviewLog],
    },
  };
};



export { computeNextReview, ratingToSubjectiveScore, createReviewLogEntry, createReviewPatchFromRating, createLatestReviewLogPatch };


export type { ReviewAlgorithmInput, ReviewAlgorithmResult, MultipleChoiceConfidence, MultipleChoiceReviewMeta };
