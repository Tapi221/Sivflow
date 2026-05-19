import {
  buildTimelineColumns,
  getTimelineAnchorColumnIndex,
  getTimelineColumnWidth,
} from "@/features/calendar/grid/TimelineDayView.shared";
import type { CalendarViewMode, TimelineUnitBuffer } from "../calendarPane.types";

export const useTimelineGrid = ({
  currentDate,
  selectedViewMode,
  timelineUnitBuffer,
}: {
  currentDate: Date;
  selectedViewMode: CalendarViewMode;
  timelineUnitBuffer: TimelineUnitBuffer;
}) => {
  const timelineColumns = buildTimelineColumns(
    selectedViewMode,
    currentDate,
    timelineUnitBuffer,
  );

  const timelineColumnWidth = getTimelineColumnWidth(
    selectedViewMode,
    60,
  );

  const timelineAnchorColumnIndex = getTimelineAnchorColumnIndex(
    timelineColumns,
    currentDate,
  );

  return {
    timelineColumns,
    timelineColumnWidth,
    timelineAnchorColumnIndex,
  };
};