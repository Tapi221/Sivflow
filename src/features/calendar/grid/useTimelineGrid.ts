import { useMemo } from "react";

import {
  getTimelineAnchorColumnIndex,
  getTimelineColumnWidth,
} from "@/features/calendar/grid/TimelineDayView.shared";

import type { CalendarViewMode } from "../scheduleScreen.types";
import type { TimelineUnitBuffer } from "./TimelineDayView.shared";
import { useScheduleTimelineColumns } from "./useScheduleColumns";

export const useTimelineGrid = ({
  currentDate,
  selectedViewMode,
  timelineUnitBuffer,
}: {
  currentDate: Date;
  selectedViewMode: CalendarViewMode;
  timelineUnitBuffer: TimelineUnitBuffer;
}) => {
  const timelineColumns = useScheduleTimelineColumns({
    anchorDate: currentDate,
    viewMode: selectedViewMode,
    buffer: timelineUnitBuffer,
  });

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
