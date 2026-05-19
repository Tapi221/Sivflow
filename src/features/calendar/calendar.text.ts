/**
 * calendar.text.ts
 *
 * 静的な文字列定数はそのままエクスポートしつつ、
 * ロケール依存の値は useT() / TRANSLATIONS で管理する。
 *
 * ⚠️ WEEKDAY_LABELS / MINI_CALENDAR_WEEKDAYS は
 *    コンポーネント側で `useT()` を使い
 *    t.weekdayLabels / t.miniCalendarWeekdays を参照してください。
 *
 *    後方互換のためフォールバック定数を残しておきます（日本語固定）。
 */

// ── フォールバック（日本語固定）──────────────────────────────
// 新規コンポーネントでは useT() を使ってください。
export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
export const MINI_CALENDAR_WEEKDAYS = [
  "S",
  "M",
  "T",
  "W",
  "T",
  "F",
  "S",
] as const;

// ── リサイズハンドル ────────────────────────────────────────
// 新規コンポーネントでは t.monthRowResizeTitle / t.monthRowResizeAriaLabel を使用。
export const MONTH_ROW_RESIZE_TITLE =
  "ドラッグで月表示の縦幅を変更。ダブルクリックで初期値に戻します。";
export const MONTH_ROW_RESIZE_ARIA_LABEL = "月表示の日付セルの高さを調整";