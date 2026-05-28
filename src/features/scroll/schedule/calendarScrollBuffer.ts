import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

type CalendarScrollBufferSurface = "calendar";

type CalendarScrollBufferDirection = "left" | "right";

export type CalendarScrollBuffer = {
  before: number;
  after: number;
};

type CalendarScrollBufferConfig = {
  unitsPerScreen: number;
  initialScreens: CalendarScrollBuffer;
  extendScreens: number;
  maxUnits: CalendarScrollBuffer;
};

type ExtendCalendarScrollBufferOptions = {
  surface: CalendarScrollBufferSurface;
  viewMode: CalendarViewMode;
  buffer: CalendarScrollBuffer;
  direction: CalendarScrollBufferDirection;
};

const FIXED_VIRTUAL_RAIL_DAYS = 3650;

const CALENDAR_SCROLL_BUFFER_CONFIG = {
  calendar: {
    year: {
      unitsPerScreen: 1,
      initialScreens: { before: 0, after: 0 },
      extendScreens: 0,
      maxUnits: { before: 0, after: 0 },
    },
    days: {
      unitsPerScreen: 1,
      initialScreens: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
      extendScreens: 0,
      maxUnits: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
    },
    threeDays: {
      unitsPerScreen: 1,
      initialScreens: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
      extendScreens: 0,
      maxUnits: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
    },
    week: {
      unitsPerScreen: 1,
      initialScreens: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
      extendScreens: 0,
      maxUnits: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
    },
    timetable: {
      unitsPerScreen: 1,
      initialScreens: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
      extendScreens: 0,
      maxUnits: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
    },
    month: {
      unitsPerScreen: 1,
      initialScreens: { before: 0, after: 0 },
      extendScreens: 0,
      maxUnits: { before: 0, after: 0 },
    },
    list: {
      unitsPerScreen: 1,
      initialScreens: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
      extendScreens: 0,
      maxUnits: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
    },
    pieChart: {
      unitsPerScreen: 1,
      initialScreens: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
      extendScreens: 0,
      maxUnits: { before: FIXED_VIRTUAL_RAIL_DAYS, after: FIXED_VIRTUAL_RAIL_DAYS },
    },
  },
} satisfies Record<CalendarScrollBufferSurface, Record<CalendarViewMode, CalendarScrollBufferConfig>>;

const toUnitCount = (screenCount: number, unitsPerScreen: number) =>
  Math.max(0, Math.round(screenCount * unitsPerScreen));

const getCalendarScrollBufferConfig = (
  surface: CalendarScrollBufferSurface,
  viewMode: CalendarViewMode,
) => CALENDAR_SCROLL_BUFFER_CONFIG[surface][viewMode];

const clampCalendarScrollBuffer = (
  buffer: CalendarScrollBuffer,
  maxUnits: CalendarScrollBuffer,
): CalendarScrollBuffer => ({
  before: Math.min(buffer.before, maxUnits.before),
  after: Math.min(buffer.after, maxUnits.after),
});

export const createCalendarScrollBuffer = (
  surface: CalendarScrollBufferSurface,
  viewMode: CalendarViewMode,
): CalendarScrollBuffer => {
  const config = getCalendarScrollBufferConfig(surface, viewMode);

  return clampCalendarScrollBuffer(
    {
      before: toUnitCount(config.initialScreens.before, config.unitsPerScreen),
      after: toUnitCount(config.initialScreens.after, config.unitsPerScreen),
    },
    config.maxUnits,
  );
};

export const getCalendarScrollBufferExtendUnits = (
  surface: CalendarScrollBufferSurface,
  viewMode: CalendarViewMode,
) => {
  const config = getCalendarScrollBufferConfig(surface, viewMode);

  return toUnitCount(config.extendScreens, config.unitsPerScreen);
};

export const extendCalendarScrollBuffer = ({
  surface,
  viewMode,
  buffer,
  direction,
}: ExtendCalendarScrollBufferOptions): CalendarScrollBuffer => {
  const config = getCalendarScrollBufferConfig(surface, viewMode);
  const extendUnits = getCalendarScrollBufferExtendUnits(surface, viewMode);

  if (extendUnits <= 0) return buffer;

  const nextBuffer = direction === "left"
    ? { ...buffer, before: buffer.before + extendUnits }
    : { ...buffer, after: buffer.after + extendUnits };
  const clampedBuffer = clampCalendarScrollBuffer(nextBuffer, config.maxUnits);

  return clampedBuffer.before === buffer.before && clampedBuffer.after === buffer.after
    ? buffer
    : clampedBuffer;
};