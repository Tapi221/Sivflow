import * as C from "@/features/calendar/calendar.constants.desktop";

import type { CalendarViewMode } from "../../schedulePane.types";

export const useCalendarLayout = ({
  viewportWidth,
  visibleDays,
  displayDays,
  selectedViewMode,
  currentDate,
  calendarBuffer: _calendarBuffer,
}: {
  viewportWidth: number;
  visibleDays: Date[];
  displayDays: Date[];
  selectedViewMode: CalendarViewMode;
  currentDate: Date;
  calendarBuffer: { before: number; after: number };
}) => {
  const viewportDayCount =
    selectedViewMode === "month" ? 7 : displayDays.length;

  const viewportInlineInset =
    selectedViewMode === "month" ? 0 : C.WEEKDAY_SURFACE_LEFT_INSET_PX;

  const calendarDayColumnWidth =
    viewportWidth > C.TIME_COLUMN_WIDTH + viewportInlineInset
      ? Math.max(
        1,
        (viewportWidth - viewportInlineInset - C.TIME_COLUMN_WIDTH) /
          Math.max(1, viewportDayCount),
      )
      : C.DAY_COLUMN_MIN_WIDTH;

  const renderDayCount =
    selectedViewMode === "month" ? displayDays.length : visibleDays.length;

  const gridWidth =
    C.TIME_COLUMN_WIDTH + renderDayCount * calendarDayColumnWidth;

  const titleDate =
    selectedViewMode === "month" ? new Date(currentDate) : currentDate;

  const monthLabel = null;

  const timelineGridStyle = {
    "--calendar-hour-row-height": `${C.DEFAULT_HOUR_ROW_HEIGHT}px`,
    gridTemplateColumns: `${C.TIME_COLUMN_WIDTH}px repeat(${renderDayCount}, ${calendarDayColumnWidth}px)`,
    minWidth: `${gridWidth}px`,
  } as const;

  return {
    calendarDayColumnWidth,
    timelineGridStyle,
    titleDate,
    monthLabel,
  };
};