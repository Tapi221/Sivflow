import { Timestamp } from 'firebase/firestore';
import type { SubjectiveScore } from '@/utils/reviewUtils';

export type ReviewAlgorithmInput = {
  card: {
    memoryStability?: number | null;
    currentLevel?: number | null;
    level?: number | null;
    nextReviewDate?: Date | Timestamp | null;
    lastReviewAt?: Date | Timestamp | null;
    recoveryRemaining?: number | null;
    reviewCount?: number | null; // Added
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
};

// Constants
const MIN_STABILITY = 0.01;  // Prevent division by zero
const MAX_STABILITY = 1.0;
const MAX_INTERVAL_DAYS = 90;

// Helper: Convert Firestore Timestamp or Date to Date
const toDate = (value?: Date | Timestamp | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as any)?.toDate === 'function') return (value as any).toDate();
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

// Normalize legacy level (0-5) to new stability (0-1)
const legacyLevelToStability = (level: number): number => {
  // Map levels 0-5 to stability 0.1-0.9
  const normalized = 0.1 + (Math.min(5, Math.max(0, level)) / 5) * 0.8;
  return clampStability(normalized);
};

// Get initial stability for a card
export const getInitialStability = (
  memoryStability?: number | null,
  legacyLevel?: number | null
): number => {
  // If we have a valid 0-1 stability, use it directly
  if (typeof memoryStability === 'number' && Number.isFinite(memoryStability)) {
    if (memoryStability > 0 && memoryStability <= 1) {
      return clampStability(memoryStability);
    }
    // Legacy format (5-100 days): convert to 0-1 range
    if (memoryStability > 1 && memoryStability <= 100) {
      return clampStability((memoryStability - 5) / 95);
    }
  }
  
  // Fall back to legacy level if available
  if (typeof legacyLevel === 'number' && Number.isFinite(legacyLevel)) {
    return legacyLevelToStability(legacyLevel);
  }
  
  // Default: 30% stability for new cards
  return 0.30;
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
const updateStability = (currentStability: number, score: SubjectiveScore): number => {
  let newStability: number;
  
  switch (score) {
    case 0: // 忘れた - 50% decrease (Factor 0.5)
      // Updated to 0.5 based on strict user request
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

/**
 * Main review algorithm
 */
export const computeNextReview = ({ 
  card, 
  subjectiveScore, 
  now = new Date(),
  delayBonusEnabled = false
}: ReviewAlgorithmInput & { delayBonusEnabled?: boolean }): ReviewAlgorithmResult => {
  // Get current stability (with legacy conversion)
  const legacyLevel = card.currentLevel ?? card.level ?? null;
  const currentStability = getInitialStability(card.memoryStability ?? null, legacyLevel);
  
  // Calculate delay (days overdue) - Used for reference/metrics but NOT logic if following strict spec
  const plannedDate = toDate(card.nextReviewDate ?? null);
  const diff = plannedDate ? diffDays(now, plannedDate) : 0;
  const delayDays = Math.max(0, diff);
  
  // Update stability based on review result
  // Note: Strict adherence to specification image - No decay penalty for delay.
  let newStability = updateStability(currentStability, subjectiveScore);

  // Delay Bonus Logic
  if (delayBonusEnabled && delayDays > 0) {
     // Formula: S' = S' * (1 + log2(1 + L))
     const bonusFactor = 1 + Math.log2(1 + delayDays);
     newStability = clampStability(newStability * bonusFactor);
  }
  
  // Recovery Mode Removed as per user request (Step 1281)
  // recoveryRemaining is kept in type/return for schema compatibility but logic is disabled.
  // Recovery Mode Removed
  const recoveryRemaining = 0;
  
  // Calculate next interval
  const intervalDays = calculateIntervalDays(newStability);

  // Calculate next review date
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
  nextReviewDate.setHours(0, 0, 0, 0);

  // Increment review count
  const currentReviewCount = card.reviewCount ?? 0;
  const reviewCount = currentReviewCount + 1;
  
  return {
    memoryStability: newStability,
    nextReviewDate,
    lastReviewAt: now,
    lastSubjectiveScore: subjectiveScore,
    recoveryRemaining,
    intervalDays,
    delayDays,
    reviewCount, // Return new count
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
export const calculateRecallProbability = (stability: number, daysSinceReview: number): number => {
  if (stability <= 0) return 0;
  if (daysSinceReview <= 0) return 1;
  
  // Scale stability for the exponential formula
  // stability=1 should give ~50% recall after ~70 days
  const scaledStability = stability * 100;
  return Math.exp(-daysSinceReview / scaledStability);
};
