import { useMemo } from "react";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";
import type { ScheduleColumnBuffer } from "./ScheduleColumn.shared";
import { buildScheduleDisplayDays, buildScheduleInteractionDays, buildScheduleTimelineColumns } from "./ScheduleColumn.shared";

type UseScheduleDaysParams = {
  anchorDate: Date;
  viewMode: CalendarViewMode;
  buffer: ScheduleColumnBuffer;
};

export const useScheduleDays = ({
  anchorDate,
  viewMode,
  buffer,
}: UseScheduleDaysParams) => {
  return useMemo(() => {
    const displayDays = buildScheduleDisplayDays(anchorDate, viewMode);
    const interactionDays = buildScheduleInteractionDays(
      anchorDate,
      viewMode,
      buffer,
    );

    return {
      displayDays,
      interactionDays,
      syncRange: {
        start: interactionDays[0],
        end: interactionDays[interactionDays.length - 1],
      },
    };
  }, [anchorDate, buffer, viewMode]);
};

type UseScheduleTimelineColumnsParams = {
  anchorDate: Date;
  viewMode: CalendarViewMode;
  buffer: ScheduleColumnBuffer;
};

export const useScheduleTimelineColumns = ({
  anchorDate,
  viewMode,
  buffer,
}: UseScheduleTimelineColumnsParams) => {
  return useMemo(
    () => buildScheduleTimelineColumns(viewMode, anchorDate, buffer),
    [anchorDate, buffer, viewMode],
  );
};
