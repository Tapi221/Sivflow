import { useMemo } from "react";

import {
  buildTimelineColumns,
  getTimelineAnchorColumnIndex,
  getTimelineColumnWidth,
} from "@/features/calendar/grid/TimelineDayView.shared";

import type { CalendarViewMode } from "../schedulePane.types";
import type { TimelineUnitBuffer } from "./TimelineDayView.shared";
export const useTimelineGrid = ({
  currentDate,
  selectedViewMode,
  timelineUnitBuffer,
}: {
  currentDate: Date;
  selectedViewMode: CalendarViewMode;
  timelineUnitBuffer: TimelineUnitBuffer;
}) => {
  const timelineColumns = useMemo(
    () =>
      buildTimelineColumns(
        selectedViewMode,
        currentDate,
        timelineUnitBuffer,
      ),
    [currentDate, selectedViewMode, timelineUnitBuffer],
  );

  const timelineColumnWidth = useMemo(
    () => getTimelineColumnWidth(selectedViewMode, 60),
    [selectedViewMode],
  );

  const timelineAnchorColumnIndex = useMemo(
    () => getTimelineAnchorColumnIndex(timelineColumns, currentDate),
    [currentDate, timelineColumns],
  );

  return {
    timelineColumns,
    timelineColumnWidth,
    timelineAnchorColumnIndex,
  };
};
