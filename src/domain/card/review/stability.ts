type SubjectiveScore = 0 | 1 | 2 | 3;



const MIN_STABILITY = 0.01;
const MAX_STABILITY = 1.0;



const clampStability = (value: number): number => {
  return Math.min(MAX_STABILITY, Math.max(MIN_STABILITY, value));
};
const mapLegacyLevelToStability = (level: number): number => {
  const normalized = 0.1 + (Math.min(5, Math.max(0, level)) / 5) * 0.8;
  return clampStability(normalized);
};
const normalizeMemoryStability = (value?: number | null, legacyLevel?: number | null): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 0 && value <= 1) {
      return clampStability(value);
    }

    if (value > 1 && value <= 100) {
      return clampStability((value - 5) / 95);
    }
  }

  if (typeof legacyLevel === "number" && Number.isFinite(legacyLevel)) {
    return mapLegacyLevelToStability(legacyLevel);
  }

  return 0;
};



export { normalizeMemoryStability };


export type { SubjectiveScore };
