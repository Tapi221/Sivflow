// カード状態→ラベル・色分け
export const CARD_STATE_LABELS: Record<string, string> = {
  "PRE-LEARN": "未学習",
  STABLE: "安定",
  DECAYING: "劣化中",
  FAILED: "失敗",
  RELEARN: "再学習",
};

export const CARD_STATE_COLORS: Record<string, string> = {
  "PRE-LEARN": "bg-gray-200 text-gray-700",
  STABLE: "bg-green-200 text-green-700",
  DECAYING: "bg-orange-200 text-orange-700",
  FAILED: "bg-red-200 text-red-700",
  RELEARN: "bg-blue-200 text-blue-700",
};

export type SubjectiveScore = 0 | 1 | 2 | 3;

export const SUBJECTIVE_OPTIONS: Array<{
  score: SubjectiveScore;
  label: string;
  emoji: string;
  description: string;
}> = [
  {
    score: 3,
    label: "余裕",
    emoji: "😄",
    description: "かなりスムーズに思い出せた",
  },
  {
    score: 2,
    label: "覚えた",
    emoji: "🙂",
    description: "少し迷ったが思い出せた",
  },
  {
    score: 1,
    label: "あいまい",
    emoji: "😐",
    description: "思い出しはしたが自信は薄い",
  },
  { score: 0, label: "忘れた", emoji: "😵", description: "ほぼ思い出せない" },
];

export const SUBJECTIVE_LABELS: Record<SubjectiveScore, string> = {
  3: "余裕",
  2: "覚えた",
  1: "あいまい",
  0: "忘れた",
};

export const SUBJECTIVE_EMOJIS: Record<SubjectiveScore, string> = {
  3: "😄",
  2: "🙂",
  1: "😐",
  0: "😵",
};

// Stability constants (0-1 range)
const MIN_STABILITY = 0.01;
const MAX_STABILITY = 1.0;

// Legacy level (0-5) to new stability (0-1) mapping
export const mapLegacyLevelToStability = (level: number): number => {
  // Map levels 0-5 to stability 0.1-0.9
  const normalized = 0.1 + (Math.min(5, Math.max(0, level)) / 5) * 0.8;
  return clampStability(normalized);
};

/**
 * Normalize memory stability to 0-1 range
 * Handles both new format (0-1) and legacy format (5-100 days)
 */
export const normalizeMemoryStability = (
  value?: number | null,
  legacyLevel?: number | null,
): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    // New format: already in 0-1 range
    if (value > 0 && value <= 1) {
      return clampStability(value);
    }
    // Legacy format: 5-100 days, convert to 0-1
    if (value > 1 && value <= 100) {
      return clampStability((value - 5) / 95);
    }
  }
  if (typeof legacyLevel === "number" && Number.isFinite(legacyLevel)) {
    return mapLegacyLevelToStability(legacyLevel);
  }
  return 0;
};

export type StabilityPhase = {
  key: "unstable" | "fragile" | "growing" | "stable" | "solid";
  label: string;
  shortLabel: string;
  colorClass: string;
  calendarClass: string;
};

import { calculateRetentionProbability } from "./reviewMetrics";

// Phase thresholds for Retention Probability (0-100 range)
const PHASES: Array<{ min: number; phase: StabilityPhase }> = [
  {
    min: 0,
    phase: {
      key: "unstable",
      label: "要復習",
      shortLabel: "要復習",
      colorClass: "bg-red-100 text-red-700",
      calendarClass: "bg-red-400",
    },
  },
  {
    min: 20,
    phase: {
      key: "fragile",
      label: "覚えかけ",
      shortLabel: "覚えかけ",
      colorClass: "bg-orange-100 text-orange-700",
      calendarClass: "bg-orange-400",
    },
  },
  {
    min: 40,
    phase: {
      key: "growing",
      label: "定着途上",
      shortLabel: "定着途上",
      colorClass: "bg-yellow-100 text-yellow-700",
      calendarClass: "bg-yellow-400",
    },
  },
  {
    min: 65,
    phase: {
      key: "stable",
      label: "安定",
      shortLabel: "安定",
      colorClass: "bg-green-100 text-green-700",
      calendarClass: "bg-green-400",
    },
  },
  {
    min: 85,
    phase: {
      key: "solid",
      label: "長期保持",
      shortLabel: "長期保持",
      colorClass: "bg-emerald-100 text-emerald-700",
      calendarClass: "bg-emerald-400",
    },
  },
];

/**
 * Get stability phase based on Retention Probability.
 *
 * @param stabilityInternal - Internal Memory Stability (0-1)
 * @param intervalDays - Days until next review (or current interval)
 */
export const getStabilityPhase = (
  stabilityInternal: number,
  intervalDays: number = 1,
): StabilityPhase => {
  // Normalize S first
  const s = normalizeMemoryStability(stabilityInternal);

  // Calculate P (Retention %)
  const retention = calculateRetentionProbability(s, intervalDays);

  // Find phase
  const matched = [...PHASES].reverse().find((entry) => retention >= entry.min);
  return matched?.phase ?? PHASES[0].phase;
};

/**
 * Get stability phase based on Resistance Score.
 *
 * @param resistanceScore - Resistance Score (0-100)
 */
export const getResistancePhase = (resistanceScore: number): StabilityPhase => {
  // Use thresholds matched to Statistics/Calendar
  // 0-20: Unstable (Red)
  // 20-40: Fragile (Orange)
  // 40-70: Growing (Yellow)   <-- Note: Calendar uses 30-70 for Stable? Verify alignment.
  // 70-85: Stable (Teal)
  // 85-100: Solid (Green)

  // Checking Calendar.jsx:
  // < 30 : Red (Developing)
  // 30 - 70 : Blue (Stable)
  // >= 70 : Green (Solid)

  // Checking StatsCharts.tsx (Resistance Score Distribution):
  // 0-20: Red
  // 20-40: Orange
  // 40-65: Yellow
  // 65-85: Teal
  // 85-100: Green

  // The user asked to Unify. StatsCharts has the most granular definition which aligns with the "Phase" definition in reviewUtils.
  // We should map Resistance Score to these phases.

  // Mapping Strategy:
  // 0-20: unstable
  // 20-40: fragile
  // 40-65: growing
  // 65-85: stable
  // 85-100: solid

  const score = Math.min(100, Math.max(0, resistanceScore));

  const matched = [...PHASES].reverse().find((entry) => score >= entry.min);
  return matched?.phase ?? PHASES[0].phase;
};

export const clampStability = (value: number): number => {
  return Math.min(MAX_STABILITY, Math.max(MIN_STABILITY, value));
};




