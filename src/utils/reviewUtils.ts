// カード状態→ラベル・色分け
export type SubjectiveScore = 0 | 1 | 2 | 3;
// Stability constants (0-1 range)
const MIN_STABILITY = 0.01;
const MAX_STABILITY = 1.0;

// Legacy level (0-5) to new stability (0-1) mapping
const mapLegacyLevelToStability = (level: number): number => {
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
const getStabilityPhase = (
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
const clampStability = (value: number): number => {
  return Math.min(MAX_STABILITY, Math.max(MIN_STABILITY, value));
};
