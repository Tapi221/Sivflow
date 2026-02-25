export const MAX_EXTRA_ROWS = 120;

export function normalizeExtraRows(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(MAX_EXTRA_ROWS, Math.round(parsed)));
}
