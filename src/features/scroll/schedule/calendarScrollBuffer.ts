import type { CalendarViewMode } from "../../calendar/scheduleScreen.types";

type CalendarScrollBufferSurface = "calendar" | "timeline";

type CalendarScrollBuffer = {
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
};

const CALENDAR_SCROLL_BUFFER_CONFIG = {
  calendar: {
    days: {
      unitsPerScreen: 1,
      initialScreens: { before: 7, after: 7 },
      extendScreens: 14,
    },
    week: {
      unitsPerScreen: 7,
      initialScreens: { before: 1, after: 1 },
      extendScreens: 2,
    },
    month: {
      unitsPerScreen: 1,
      initialScreens: { before: 0, after: 0 },
      extendScreens: 0,
    },
  },
  timeline: {
    days: {
      unitsPerScreen: 1,
      initialScreens: { before: 7, after: 14 },
      extendScreens: 14,
    },
    week: {
      unitsPerScreen: 1,
      initialScreens: { before: 4, after: 8 },
      extendScreens: 14,
    },
    month: {
      unitsPerScreen: 1,
      initialScreens: { before: 3, after: 8 },
      extendScreens: 14,
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

export const createCalendarScrollBuffer = (
  surface: CalendarScrollBufferSurface,
  viewMode: CalendarViewMode,
): CalendarScrollBuffer => {
  const config = getCalendarScrollBufferConfig(surface, viewMode);

  return {
    before: toUnitCount(config.initialScreens.before, config.unitsPerScreen),
    after: toUnitCount(config.initialScreens.after, config.unitsPerScreen),
  };
};

export const getCalendarScrollBufferExtendUnits = (
  surface: CalendarScrollBufferSurface,
  viewMode: CalendarViewMode,
) => {
  const config = getCalendarScrollBufferConfig(surface, viewMode);

  return toUnitCount(config.extendScreens, config.unitsPerScreen);
};
