import { useMemo } from "react";
import type { CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import type { ScheduleColumnBuffer } from "./ScheduleColumn.shared";
import { buildScheduleDisplayDays, buildScheduleInteractionDays, buildScheduleVirtualRail } from "./ScheduleColumn.shared";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";



type UseScheduleDaysParams = {
  anchorDate: Date;
  viewMode: CalendarViewMode;
  buffer: ScheduleColumnBuffer;
  weekStartDay: CalendarWeekStartDay;
};



const VIRTUAL_RAIL_VIEW_MODES = new Set<CalendarViewMode>([
  "days",
  "threeDays",
  "week",
  "timetable",
  "list",
  "pieChart",
]);



const useScheduleDays = ({ anchorDate, viewMode, buffer, weekStartDay }: UseScheduleDaysParams) => {
  return useMemo(() => {
    const displayDays = buildScheduleDisplayDays(anchorDate, viewMode, weekStartDay);
    const interactionDays = VIRTUAL_RAIL_VIEW_MODES.has(viewMode)
      ? displayDays
      : buildScheduleInteractionDays(
        anchorDate,
        viewMode,
        buffer,
        weekStartDay,
      );
    const virtualRail = buildScheduleVirtualRail(anchorDate, viewMode, buffer, weekStartDay);

    return {
      displayDays,
      interactionDays,
      virtualRail,
      syncRange: {
        start: interactionDays[0],
        end: interactionDays[interactionDays.length - 1],
      },
    };
  }, [anchorDate, buffer, viewMode, weekStartDay]);
};



export { useScheduleDays };
