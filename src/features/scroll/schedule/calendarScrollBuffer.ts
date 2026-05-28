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
      initialScreens: { before: 7, after: 14 },
      extendScreens: 14,
      maxUnits: { before: 365, after: 365 },
    },
    threeDays: {
      unitsPerScreen: 3,
      initialScreens: { before: 2, after: 3 },
      extendScreens: 7,
      maxUnits: { before: 365, after: 365 },
    },
    week: {
      unitsPerScreen: 7,
      initialScreens: { before: 2, after: 3 },
      extendScreens: 4,
      maxUnits: { before: 365, after: 365 },
    },
    timetable: {
      unitsPerScreen: 7,
      initialScreens: { before: 0, after: 0 },
      extendScreens: 0,
      maxUnits: { before: 0, after: 0 },
    },
    month: {
      unitsPerScreen: 1,
      initialScreens: { before: 0, after: 0 },
      extendScreens: 0,
      maxUnits: { before: 0, after: 0 },
    },
    list: {
      unitsPerScreen: 31,
      initialScreens: { before: 12, after: 12 },
      extendScreens: 6,
      maxUnits: { before: 3650, after: 3650 },
    },
    pieChart: {
      unitsPerScreen: 31,
      initialScreens: { before: 12, after: 12 },
      extendScreens: 6,
      maxUnits: { before: 3650, after: 3650 },
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