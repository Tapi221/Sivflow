import {
  buildScheduleDisplayDays,
  buildScheduleInteractionDays,
} from "./grid/ScheduleColumn.shared";

import type {
  CalendarViewMode,
  TimelineBufferDays,
} from "../calendar/schedulePane.types";

export const useCalendarVisibleRange = ({
  currentDate,
  selectedViewMode,
  calendarBuffer,
}: {
  currentDate: Date;
  selectedViewMode: CalendarViewMode;
  calendarBuffer: TimelineBufferDays;
}) => {
  const displayDays = buildScheduleDisplayDays(currentDate, selectedViewMode);
  const interactionDays = buildScheduleInteractionDays(
    currentDate,
    selectedViewMode,
    calendarBuffer,
  );

  const syncStart = interactionDays[0];
  const syncEnd = interactionDays[interactionDays.length - 1];

  return {
    displayDays,
    interactionDays,

    syncRange: {
      start: syncStart,
      end: syncEnd,
    },
  };
};