import type { ScheduleColumn, ScheduleColumnBuffer } from "./ScheduleColumn.shared";
import { buildScheduleTimelineColumns } from "./ScheduleColumn.shared";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

export type TimelineViewMode = CalendarViewMode;

export type TimelineUnitBuffer = ScheduleColumnBuffer;

export type TimelineColumn = ScheduleColumn;

export const buildTimelineColumns = buildScheduleTimelineColumns;

export const getTimelineColumnWidth = (
  viewMode: TimelineViewMode,
  dayColumnWidth: number,
) => {
  if (viewMode === "year") {
    return Math.max(220, Math.round(dayColumnWidth * 2));
  }

  if (viewMode === "month") {
    return Math.max(168, Math.round(dayColumnWidth * 1.6));
  }

  if (viewMode === "week") {
    return Math.max(132, Math.round(dayColumnWidth * 1.2));
  }

  return dayColumnWidth;
};

export const getTimelineAnchorColumnIndex = (
  columns: TimelineColumn[],
  selectedDate: Date,
) => {
  const selectedTime = selectedDate.getTime();
  const matchIndex = columns.findIndex((column) => {
    return (
      selectedTime >= column.start.getTime() &&
      selectedTime <= column.end.getTime()
    );
  });

  return matchIndex >= 0 ? matchIndex : 0;
};
