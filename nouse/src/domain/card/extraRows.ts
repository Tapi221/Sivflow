const MAX_EXTRA_ROWS = 120;
// 罫線オフセット（上下44px）を維持したまま本文の罫線1行が見える最小/初期値
const DEFAULT_LAYOUT_ROWS = 3;
const MIN_LAYOUT_ROWS = 3;
// 旧データ互換: 以前の基準行数(18)を migration 計算と上限計算に使う
const LEGACY_BASE_LAYOUT_ROWS = 18;
const MAX_LAYOUT_ROWS = LEGACY_BASE_LAYOUT_ROWS + MAX_EXTRA_ROWS;



const normalizeExtraRows = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};
const normalizeLayoutRows = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LAYOUT_ROWS;
  return Math.max(MIN_LAYOUT_ROWS, Math.round(parsed));
};



export { DEFAULT_LAYOUT_ROWS, LEGACY_BASE_LAYOUT_ROWS, MAX_LAYOUT_ROWS, normalizeExtraRows, normalizeLayoutRows };
