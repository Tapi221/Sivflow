export const CALENDAR_WEEKDAY_HEADER_HEIGHT = 32;
export const CALENDAR_DAY_HEADER_CELL_HEIGHT = 112;

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export const WEEKDAY_HEADER_HEIGHT_PX =
  CALENDAR_WEEKDAY_HEADER_HEIGHT;

export const INITIAL_MONTH_BUFFER = 2;
export const MONTH_EXTEND_COUNT = 4;

export const MONTH_SCROLL_EDGE_THRESHOLD_PX = 560;
export const MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX = 56;

export const DEFAULT_MONTH_ROW_HEIGHT =
  CALENDAR_DAY_HEADER_CELL_HEIGHT;

export const MIN_MONTH_ROW_HEIGHT = 72;
export const MAX_MONTH_ROW_HEIGHT = 260;

export const MONTH_ROW_HEIGHT_STEP = 4;

export const MONTH_ROW_HEIGHT_STORAGE_KEY =
  "flashcard-master.calendar.monthRowHeight";

export const clampMonthRowHeight = (value: number) =>
  Math.min(
    MAX_MONTH_ROW_HEIGHT,
    Math.max(MIN_MONTH_ROW_HEIGHT, value),
  );

export const readStoredMonthRowHeight = () => {
  if (typeof window === "undefined") {
    return DEFAULT_MONTH_ROW_HEIGHT;
  }

  const rawValue = window.localStorage.getItem(
    MONTH_ROW_HEIGHT_STORAGE_KEY,
  );

  const parsedValue =
    rawValue === null ? Number.NaN : Number(rawValue);

  return Number.isFinite(parsedValue)
    ? normalizeStoredMonthRowHeight(
        clampMonthRowHeight(parsedValue),
      )
    : DEFAULT_MONTH_ROW_HEIGHT;
};

export const normalizeStoredMonthRowHeight = (
  value: number,
) => {
  return Math.round(value);
};

export const writeStoredMonthRowHeight = (
  value: number,
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    MONTH_ROW_HEIGHT_STORAGE_KEY,
    String(
      normalizeStoredMonthRowHeight(
        clampMonthRowHeight(value),
      ),
    ),
  );
};

export const createInitialMonthOffsetRange = () => ({
  startOffset: -INITIAL_MONTH_BUFFER,
  endOffset: INITIAL_MONTH_BUFFER,
});