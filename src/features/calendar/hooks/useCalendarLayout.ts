import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "../calendarPane.types";

export const useCalendarLayout = ({
  viewportWidth,
  visibleDays,
  selectedViewMode,
  currentDate,
  calendarBuffer,
}: {
  viewportWidth: number;
  visibleDays: Date[];
  selectedViewMode: CalendarViewMode;
  currentDate: Date;
  calendarBuffer: { before: number; after: number };
}) => {
  const viewportDayCount = selectedViewMode === "month" ? 7 : visibleDays.length;

  const calendarDayColumnWidth =
    viewportWidth > C.TIME_COLUMN_WIDTH
      ? Math.max(
          1,
          (viewportWidth - C.TIME_COLUMN_WIDTH) /
            Math.max(1, viewportDayCount),
        )
      : C.DAY_COLUMN_MIN_WIDTH;

  const gridWidth =
    C.TIME_COLUMN_WIDTH + visibleDays.length * calendarDayColumnWidth;

  const titleDate =
    selectedViewMode === "month"
      ? new Date(currentDate)
      : currentDate;

  const monthLabel = null;

  const timelineGridStyle = {
    "--calendar-hour-row-height": `${C.DEFAULT_HOUR_ROW_HEIGHT}px`,
    gridTemplateColumns: `${C.TIME_COLUMN_WIDTH}px repeat(${visibleDays.length}, ${calendarDayColumnWidth}px)`,
    minWidth: `${gridWidth}px`,
  } as const;

  return {
    calendarDayColumnWidth,
    timelineGridStyle,
    titleDate,
    monthLabel,
  };
};