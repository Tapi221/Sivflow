import {
  addDays,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

import * as C from "@/features/calendar/calendar.constants.desktop";

import type {
  CalendarViewMode,
  TimelineBufferDays,
} from "../schedulePane.types";

// ─────────────────────────────────────────────
// util
// ─────────────────────────────────────────────

const getRangeDayCount = (baseDate: Date, viewMode: CalendarViewMode) => {
  switch (viewMode) {
    case "month":
      return getDaysInMonth(baseDate);
    case "week":
      return 7;
    case "days":
    default:
      return 1;
  }
};

// ─────────────────────────────────────────────
// hook
// ─────────────────────────────────────────────

export const useCalendarVisibleRange = ({
  currentDate,
  selectedViewMode,
  calendarBuffer,
}: {
  currentDate: Date;
  selectedViewMode: CalendarViewMode;
  calendarBuffer: TimelineBufferDays;
}) => {
  const normalized = startOfDay(currentDate);

  // ─────────────────────────────
  // UI基準の開始日
  // ─────────────────────────────

  const baseStart =
    selectedViewMode === "month"
      ? startOfMonth(normalized)
      : selectedViewMode === "week"
        ? startOfWeek(normalized, {
            weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
          })
        : normalized;

  const visibleCount = getRangeDayCount(normalized, selectedViewMode);

  // ─────────────────────────────
  // UI表示範囲（描画専用）
  // ─────────────────────────────

  const displayDays = Array.from({ length: visibleCount }, (_, i) =>
    addDays(baseStart, i),
  );

  // ─────────────────────────────
  // インタラクション範囲（UI操作基準）
  // ─────────────────────────────

  const interactionStart = subDays(baseStart, calendarBuffer.before);

  const interactionCount =
    calendarBuffer.before + visibleCount + calendarBuffer.after;

  const interactionDays = Array.from({ length: interactionCount }, (_, i) =>
    addDays(interactionStart, i),
  );

  // ─────────────────────────────
  // 同期範囲（RangeController用）
  // ─────────────────────────────

  const syncStart = interactionDays[0];
  const syncEnd = interactionDays[interactionDays.length - 1];

  return {
    displayDays,
    interactionDays,

    syncRange: {
      start: syncStart,
      end: syncEnd,
    },
  };
};