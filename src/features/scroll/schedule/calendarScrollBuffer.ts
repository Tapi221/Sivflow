import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

type CalendarScrollBufferSurface = "calendar" | "timeline";

type CalendarScrollBufferDirection = "left" | "right";

export type CalendarScrollBuffer = {
  before: number;
  after: number;
};

type CalendarScrollBufferConfig = {
  /**
   * 1画面ぶんを何カラムとして数えるか。
   * calendar の週表示は 1画面 = 7日、timeline は 1画面 = 1カラムとして扱う。
   */
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
    days: {
      unitsPerScreen: 1,
      initialScreens: { before: 7, after: 7 },
      extendScreens: 14,
      maxUnits: { before: 28, after: 28 },
    },
    threeDays: {
      unitsPerScreen: 3,
      initialScreens: { before: 2, after: 2 },
      extendScreens: 4,
      maxUnits: { before: 18, after: 18 },
    },
    week: {
      unitsPerScreen: 7,
      initialScreens: { before: 1, after: 1 },
      extendScreens: 2,
      maxUnits: { before: 28, after: 28 },
    },
    month: {
      unitsPerScreen: 1,
      initialScreens: { before: 0, after: 0 },
      extendScreens: 0,
      maxUnits: { before: 0, after: 0 },
    },
    pieChart: {
      unitsPerScreen: 1,
      initialScreens: { before: 0, after: 0 },
      extendScreens: 0,
      maxUnits: { before: 0, after: 0 },
    },
  },
  timeline: {
    days: {
      unitsPerScreen: 1,
      initialScreens: { before: 7, after: 14 },
      extendScreens: 14,
      maxUnits: { before: 21, after: 35 },
    },
    threeDays: {
      unitsPerScreen: 1,
      initialScreens: { before: 7, after: 14 },
      extendScreens: 14,
      maxUnits: { before: 21, after: 35 },
    },
    week: {
      unitsPerScreen: 1,
      initialScreens: { before: 4, after: 8 },
      extendScreens: 14,
      maxUnits: { before: 12, after: 18 },
    },
    month: {
      unitsPerScreen: 1,
      initialScreens: { before: 3, after: 8 },
      extendScreens: 14,
      maxUnits: { before: 6, after: 12 },
    },
    pieChart: {
      unitsPerScreen: 1,
      initialScreens: { before: 0, after: 0 },
      extendScreens: 0,
      maxUnits: { before: 0, after: 0 },
    },
  },
} satisfies Record<
  CalendarScrollBufferSurface,
  Record<CalendarViewMode, CalendarScrollBufferConfig>
>;

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
