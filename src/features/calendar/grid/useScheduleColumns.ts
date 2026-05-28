import { useMemo } from "react";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";
import type { ScheduleColumnBuffer } from "./ScheduleColumn.shared";
import { buildScheduleDisplayDays, buildScheduleInteractionDays, buildScheduleVirtualRail } from "./ScheduleColumn.shared";

type UseScheduleDaysParams = {
  anchorDate: Date;
  viewMode: CalendarViewMode;
  buffer: ScheduleColumnBuffer;
};

const VIRTUAL_RAIL_VIEW_MODES = new Set<CalendarViewMode>([
  "days",
  "threeDays",
  "week",
  "timetable",
  "list",
  "pieChart",
]);

export const useScheduleDays = ({
  anchorDate,
  viewMode,
  buffer,
}: UseScheduleDaysParams) => {
  return useMemo(() => {
    const displayDays = buildScheduleDisplayDays(anchorDate, viewMode);
    const interactionDays = VIRTUAL_RAIL_VIEW_MODES.has(viewMode)
      ? displayDays
      : buildScheduleInteractionDays(
        anchorDate,
        viewMode,
        buffer,
      );
    const virtualRail = buildScheduleVirtualRail(anchorDate, viewMode, buffer);

    return {
      displayDays,
      interactionDays,
      virtualRail,
      syncRange: {
        start: interactionDays[0],
        end: interactionDays[interactionDays.length - 1],
      },
    };
  }, [anchorDate, buffer, viewMode]);
};