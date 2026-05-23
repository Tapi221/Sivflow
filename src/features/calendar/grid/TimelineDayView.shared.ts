import type {
  ScheduleColumn,
  ScheduleColumnBuffer,
} from "./ScheduleColumn.shared";
import { buildScheduleTimelineColumns } from "./ScheduleColumn.shared";

export type TimelineViewMode = "month" | "week" | "days";

export type TimelineUnitBuffer = ScheduleColumnBuffer;

export type TimelineColumn = ScheduleColumn;

export const buildTimelineColumns = buildScheduleTimelineColumns;

export const getTimelineColumnWidth = (
  viewMode: TimelineViewMode,
  dayColumnWidth: number,
) => {
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
