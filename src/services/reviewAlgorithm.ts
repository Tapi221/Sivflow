import { Timestamp } from "firebase/firestore";
import type { SubjectiveScore } from "@/utils/reviewUtils";

export type ReviewAlgorithmInput = {
  card: {
    memoryStability?: number | null;
    currentLevel?: number | null;
    level?: number | null;
    nextReviewDate?: Date | Timestamp | null;
    lastReviewAt?: Date | Timestamp | null;
    recoveryRemaining?: number | null;
    reviewCount?: number | null; // Added

    // ✅ Added: difficulty (0..1). Higher = more error-prone / harder for this user.
    difficulty?: number | null;
  };
  subjectiveScore: SubjectiveScore;
  now?: Date;
};

export type ReviewAlgorithmResult = {
  memoryStability: number;
  nextReviewDate: Date;
  lastReviewAt: Date;
  lastSubjectiveScore: SubjectiveScore;
  recoveryRemaining: number;
  intervalDays: number;
  delayDays: number;
  reviewCount: number; // Added

  // ✅ Added
  difficulty: number;
};

// Constants
const MIN_STABILITY = 0.01; // Prevent division by zero
const MAX_STABILITY = 1.0;
const MAX_INTERVAL_DAYS = 90;

// ✅ Difficulty constants (pragmatic defaults)
const MIN_DIFFICULTY = 0.0;
const MAX_DIFFICULTY = 1.0;

// EMA smoothing factor (smaller = more stable, larger = more reactive)
const DIFFICULTY_ALPHA = 0.1;

// Interval brake strength (0.0..1.0). Example: 0.30 => max 30% shorter at difficulty=1
const DIFFICULTY_INTERVAL_BRAKE = 0.3;

// Helper: Convert Firestore Timestamp or Date to Date
const toDate = (value?: Date | Timestamp | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as any)?.toDate === "function")
    return (value as any).toDate();
  if (typeof value === "object") {
    const seconds =
      typeof (value as any)?.seconds === "number"
        ? (value as any).seconds
        : typeof (value as any)?._seconds === "number"
          ? (value as any)._seconds
          : null;
    const nanoseconds =
      typeof (value as any)?.nanoseconds === "number"
        ? (value as any).nanoseconds
        : typeof (value as any)?._nanoseconds === "number"
          ? (value as any)._nanoseconds
          : 0;
    if (seconds !== null) {
      const ms = seconds * 1000 + Math.floor(nanoseconds / 1e6);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Helper: Calculate day difference
const diffDays = (a: Date, b: Date): number => {
  const msA = new Date(a).setHours(0, 0, 0, 0);
  const msB = new Date(b).setHours(0, 0, 0, 0);
  return Math.floor((msA - msB) / (1000 * 60 * 60 * 24));
};

// Clamp stability to valid range (0, 1]
const clampStability = (s: number): number => {
  return Math.max(MIN_STABILITY, Math.min(MAX_STABILITY, s));
};

// ✅ Clamp to [0,1]
const clamp01 = (x: number): number => {
  return Math.max(0, Math.min(1, x));
};

// ✅ Clamp difficulty to [0,1]
const clampDifficulty = (d: number): number => {
  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, d));
};

// Normalize legacy level (0-5) to new stability (0-1)
const legacyLevelToStability = (level: number): number => {
  // Map levels 0-5 to stability 0.1-0.9
  const normalized = 0.1 + (Math.min(5, Math.max(0, level)) / 5) * 0.8;
  return clampStability(normalized);
};

// Get initial stability for a card
export const getInitialStability = (
  memoryStability?: number | null,
  legacyLevel?: number | null,
): number => {
  // If we have a valid 0-1 stability, use it directly
  if (typeof memoryStability === "number" && Number.isFinite(memoryStability)) {
    if (memoryStability > 0 && memoryStability <= 1) {
      return clampStability(memoryStability);
    }
    // Legacy format (5-100 days): convert to 0-1 range
    if (memoryStability > 1 && memoryStability <= 100) {
      return clampStability((memoryStability - 5) / 95);
    }
  }

  // Fall back to legacy level if available
  if (typeof legacyLevel === "number" && Number.isFinite(legacyLevel)) {
    return legacyLevelToStability(legacyLevel);
  }

  // Default: 30% stability for new cards
  return 0.3;
};

// ✅ Initial difficulty (0..1)
// “測る”んじゃなくて、カードの挙動から“推定する”ための初期値。
// 既存値があればそれを採用。なければ stability から雑に推定（新規でも極端にならないように弱める）。
export const getInitialDifficulty = (
  difficulty?: number | null,
  stability?: number | null,
): number => {
  if (typeof difficulty === "number" && Number.isFinite(difficulty)) {
    return clampDifficulty(difficulty);
  }

  // Derive a conservative default from stability if available:
  // Higher stability => lower difficulty, but dampened so new cards aren't instantly "hardest".
  if (typeof stability === "number" && Number.isFinite(stability)) {
    const derived = (1 - clamp01(stability)) * 0.6; // 0..0.6 range
    return clampDifficulty(derived);
  }

  // Neutral-ish default
  return 0.35;
};

/**
 * Calculate next review interval based on stability
 * Formula: D = 1 + 100 × S^2.5
 */
const calculateIntervalDays = (stability: number): number => {
  const days = 1 + 100 * Math.pow(stability, 2.5);
  return Math.max(1, Math.min(MAX_INTERVAL_DAYS, Math.round(days)));
};

/**
 * Update stability based on subjective score
 *
 * Score 0 (忘れた): S' = S × 0.5
 * Score 1 (あいまい): S' = S × 0.8
 * Score 2 (OK): S' = S + (1-S) × 0.1
 * Score 3 (余裕): S' = S + (1-S) × 0.25
 */
const updateStability = (
  currentStability: number,
  score: SubjectiveScore,
): number => {
  let newStability: number;

  switch (score) {
    case 0: // 忘れた - 50% decrease (Factor 0.5)
      newStability = currentStability * 0.5;
      break;
    case 1: // あいまい - 20% decrease
      newStability = currentStability * 0.8;
      break;
    case 2: // 覚えた - 10% of remaining growth
      newStability = currentStability + (1 - currentStability) * 0.1;
      break;
    case 3: // 余裕 - 25% of remaining growth
      newStability = currentStability + (1 - currentStability) * 0.25;
      break;
    default:
      newStability = currentStability;
  }

  return clampStability(newStability);
};

// ✅ Subjective score -> "fail-ish" (0..1)
// This is NOT truth, just a pragmatic signal.
// 0 (Forgot) : 1.0
// 1 (Hard)   : 0.6
// 2 (Good)   : 0.2
// 3 (Easy)   : 0.0
const scoreToFailish = (score: SubjectiveScore): number => {
  switch (score) {
    case 0:
      return 1.0;
    case 1:
      return 0.6;
    case 2:
      return 0.2;
    case 3:
      return 0.0;
    default:
      return 0.2;
  }
};

// ✅ Update difficulty via EMA:
// d' = d*(1-α) + failish*α
const updateDifficulty = (
  currentDifficulty: number,
  score: SubjectiveScore,
): number => {
  const failish = scoreToFailish(score);
  const next =
    currentDifficulty * (1 - DIFFICULTY_ALPHA) + failish * DIFFICULTY_ALPHA;
  return clampDifficulty(next);
};

// ✅ Apply difficulty as a mild interval brake (safe and explainable internally)
const applyDifficultyBrakeToInterval = (
  baseIntervalDays: number,
  difficulty: number,
): number => {
  const factor = 1 - DIFFICULTY_INTERVAL_BRAKE * clampDifficulty(difficulty); // [1-k, 1]
  const adjusted = Math.round(baseIntervalDays * factor);
  return Math.max(1, Math.min(MAX_INTERVAL_DAYS, adjusted));
};

/**
 * Main review algorithm
 */
export const computeNextReview = ({
  card,
  subjectiveScore,
  now = new Date(),
  delayBonusEnabled = false,
}: ReviewAlgorithmInput & {
  delayBonusEnabled?: boolean;
}): ReviewAlgorithmResult => {
  const c: unknown = card as any;
  // Get current stability (with legacy conversion)
  const legacyLevel = (card.currentLevel ??
    c.current_level ??
    card.level ??
    c.level ??
    null) as any;
  const currentStability = getInitialStability(
    (card.memoryStability ?? c.memory_stability ?? null) as any,
    legacyLevel,
  );

  // ✅ Get current difficulty
  const currentDifficulty = getInitialDifficulty(
    (card.difficulty ?? c.difficulty ?? null) as any,
    currentStability,
  );

  // Calculate delay (days overdue)
  const plannedDate = toDate(
    (card.nextReviewDate ?? c.next_review_date ?? null) as any,
  );
  const diff = plannedDate ? diffDays(now, plannedDate) : 0;
  const delayDays = Math.max(0, diff);

  // Update stability based on review result
  let newStability = updateStability(currentStability, subjectiveScore);

  // Delay Bonus Logic
  if (delayBonusEnabled && delayDays > 0) {
    // Formula: S' = S' * (1 + log2(1 + D))
    const bonusFactor = 1 + Math.log2(1 + delayDays);
    newStability = clampStability(newStability * bonusFactor);
  }

  // ✅ Update difficulty AFTER seeing the result (and independent from delay to avoid "busy life" pollution)
  const newDifficulty = updateDifficulty(currentDifficulty, subjectiveScore);

  // Recovery Mode Removed (kept for schema compatibility)
  const recoveryRemaining = 0;

  // Calculate next interval (stability base)
  const baseIntervalDays = calculateIntervalDays(newStability);

  // ✅ Apply difficulty brake (mild encourage for “problem cards”)
  const intervalDays = applyDifficultyBrakeToInterval(
    baseIntervalDays,
    newDifficulty,
  );

  // Calculate next review date
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
  nextReviewDate.setHours(0, 0, 0, 0);

  // Increment review count
  const currentReviewCount = (card.reviewCount ?? c.review_count ?? 0) as any;
  const reviewCount = currentReviewCount + 1;

  return {
    memoryStability: newStability,
    nextReviewDate,
    lastReviewAt: now,
    lastSubjectiveScore: subjectiveScore,
    recoveryRemaining,
    intervalDays,
    delayDays,
    reviewCount,

    // ✅ Return difficulty so caller can persist it
    difficulty: newDifficulty,
  };
};

/**
 * Calculate recall probability based on time elapsed
 * Formula: R(t) = e^(-t/S)
 *
 * @param stability Current stability (0-1)
 * @param daysSinceReview Days since last review
 * @returns Recall probability (0-1)
 */
export const calculateRecallProbability = (
  stability: number,
  daysSinceReview: number,
): number => {
  if (stability <= 0) return 0;
  if (daysSinceReview <= 0) return 1;

  // Scale stability for the exponential formula
  const scaledStability = stability * 100;
  return Math.exp(-daysSinceReview / scaledStability);
};

// ============================================================================
// Multiple Choice Integration (4択モード統合)
// ============================================================================

/**
 * 4択モードでの確信度（正解時のみ取得）
 */
export type MultipleChoiceConfidence = "high" | "mid" | "luck";

/**
 * 4択モードの復習メタデータ
 */
export type MultipleChoiceReviewMeta = {
  /** 選択した答えが正解かどうか */
  isCorrect: boolean;

  /** 「分からない」を選択したか（明示的なギブアップ） */
  isUnknown?: boolean;

  /** 正解時の確信度（未入力時は自動的に 'mid' 扱い） */
  confidence?: MultipleChoiceConfidence;

  /** 選択肢表示後から回答までの時間（ミリ秒） */
  choiceTimeMs?: number;
};

/**
 * 4択結果を SubjectiveScore に変換する
 *
 * 変換ルール:
 * - isUnknown === true → 0
 * - isCorrect === false → 0
 * - isCorrect === true:
 *   - confidence === 'high' → 3
 *   - confidence === 'mid' or undefined → 2
 *   - confidence === 'luck' → 1
 *
 * 反応時間による弱い制限:
 * - choiceTimeMs > 9000ms → score を最大 1 に制限
 * - choiceTimeMs > 6000ms → score を最大 2 に制限
 *
 * @param meta 4択モードの復習メタデータ
 * @returns SubjectiveScore (0..3)
 */
export const convertMultipleChoiceToSubjectiveScore = (
  meta: MultipleChoiceReviewMeta,
): SubjectiveScore => {
  // 分からないを選択 or 不正解 → 0
  if (meta.isUnknown === true || meta.isCorrect === false) {
    return 0;
  }

  // 正解時: 確信度から base score を決定
  const confidence = meta.confidence ?? "mid"; // 未入力時は自動的に 'mid'
  let score: SubjectiveScore;

  switch (confidence) {
    case "high":
      score = 3;
      break;
    case "mid":
      score = 2;
      break;
    case "luck":
      score = 1;
      break;
    default:
      score = 2; // fallback
  }

  // 反応時間による弱い制限（オプショナル）
  if (typeof meta.choiceTimeMs === "number" && meta.choiceTimeMs > 0) {
    if (meta.choiceTimeMs > 9000) {
      // 9秒超: 最大 1 に制限（時間かかりすぎ）
      score = Math.min(score, 1) as SubjectiveScore;
    } else if (meta.choiceTimeMs > 6000) {
      // 6秒超: 最大 2 に制限（やや時間かかった）
      score = Math.min(score, 2) as SubjectiveScore;
    }
  }

  return score;
};
