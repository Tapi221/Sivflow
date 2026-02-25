export const MAX_EXTRA_ROWS = 120;
export const DEFAULT_LAYOUT_ROWS = 18;
export const MIN_LAYOUT_ROWS = 8;
export const MAX_LAYOUT_ROWS = DEFAULT_LAYOUT_ROWS + MAX_EXTRA_ROWS;

export function normalizeExtraRows(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(MAX_EXTRA_ROWS, Math.round(parsed)));
}

export function normalizeLayoutRows(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LAYOUT_ROWS;
  return Math.max(MIN_LAYOUT_ROWS, Math.min(MAX_LAYOUT_ROWS, Math.round(parsed)));
}
