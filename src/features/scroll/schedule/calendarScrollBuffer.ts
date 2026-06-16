import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";



type CalendarScrollBufferSurface = "calendar";
type CalendarScrollBuffer = {
  before: number;
  after: number;
};
type CalendarScrollBufferConfig = {
  unitsPerScreen: number;
  initialScreens: CalendarScrollBuffer;
  maxUnits: CalendarScrollBuffer;
};



const FIXED_VIRTUAL_RAIL_DAYS = 3650;
const EMPTY_SCROLL_BUFFER = { before: 0, after: 0 } as const;
const FIXED_VIRTUAL_RAIL_SCROLL_BUFFER = { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS } as const;
const CALENDAR_SCROLL_BUFFER_CONFIG = {
  calendar: {
    year: {
      unitsPerScreen: 1,
      initialScreens: EMPTY_SCROLL_BUFFER,
      maxUnits: EMPTY_SCROLL_BUFFER,
    },
    days: {
      unitsPerScreen: 1,
      initialScreens: EMPTY_SCROLL_BUFFER,
      maxUnits: EMPTY_SCROLL_BUFFER,
    },
    threeDays: {
      unitsPerScreen: 1,
      initialScreens: EMPTY_SCROLL_BUFFER,
      maxUnits: EMPTY_SCROLL_BUFFER,
    },
    week: {
      unitsPerScreen: 1,
      initialScreens: EMPTY_SCROLL_BUFFER,
      maxUnits: EMPTY_SCROLL_BUFFER,
    },
    timetable: {
      unitsPerScreen: 1,
      initialScreens: FIXED_VIRTUAL_RAIL_SCROLL_BUFFER,
      maxUnits: FIXED_VIRTUAL_RAIL_SCROLL_BUFFER,
    },
    month: {
      unitsPerScreen: 1,
      initialScreens: EMPTY_SCROLL_BUFFER,
      maxUnits: EMPTY_SCROLL_BUFFER,
    },
    list: {
      unitsPerScreen: 1,
      initialScreens: FIXED_VIRTUAL_RAIL_SCROLL_BUFFER,
      maxUnits: FIXED_VIRTUAL_RAIL_SCROLL_BUFFER,
    },
    pieChart: {
      unitsPerScreen: 1,
      initialScreens: FIXED_VIRTUAL_RAIL_SCROLL_BUFFER,
      maxUnits: FIXED_VIRTUAL_RAIL_SCROLL_BUFFER,
    },
  },
} satisfies Record<CalendarScrollBufferSurface, Record<CalendarViewMode, CalendarScrollBufferConfig>>;



const toUnitCount = (screenCount: number, unitsPerScreen: number) => Math.max(0, Math.round(screenCount * unitsPerScreen));
const getCalendarScrollBufferConfig = (surface: CalendarScrollBufferSurface, viewMode: CalendarViewMode) => CALENDAR_SCROLL_BUFFER_CONFIG[surface][viewMode];
const clampCalendarScrollBuffer = (buffer: CalendarScrollBuffer, maxUnits: CalendarScrollBuffer): CalendarScrollBuffer => ({
  before: Math.min(buffer.before, maxUnits.before),
  after: Math.min(buffer.after, maxUnits.after),
});
const createCalendarScrollBuffer = (surface: CalendarScrollBufferSurface, viewMode: CalendarViewMode): CalendarScrollBuffer => {
  const config = getCalendarScrollBufferConfig(surface, viewMode);

  return clampCalendarScrollBuffer(
    {
      before: toUnitCount(config.initialScreens.before, config.unitsPerScreen),
      after: toUnitCount(config.initialScreens.after, config.unitsPerScreen),
    },
    config.maxUnits,
  );
};



export { createCalendarScrollBuffer };


export type { CalendarScrollBuffer };
