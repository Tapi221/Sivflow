import type { CalendarViewMode } from "../schedulePane.types";

type ScrollWindowSurface = "calendar" | "timeline";

type ScrollWindowBuffer = {
  before: number;
  after: number;
};

type ScrollWindowConfig = {
  /**
   * 1画面ぶんを何カラムとして数えるか。
   * calendar の週表示は 1画面 = 7日、timeline は 1画面 = 1カラムとして扱う。
   */
  unitsPerScreen: number;
  initialScreens: ScrollWindowBuffer;
  extendScreens: number;
};

const SCROLL_WINDOW_CONFIG = {
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
  ScrollWindowSurface,
  Record<CalendarViewMode, ScrollWindowConfig>
>;

const toUnitCount = (screenCount: number, unitsPerScreen: number) =>
  Math.max(0, Math.round(screenCount * unitsPerScreen));

const getScrollWindowConfig = (
  surface: ScrollWindowSurface,
  viewMode: CalendarViewMode,
) => SCROLL_WINDOW_CONFIG[surface][viewMode];

export const createScrollWindowBuffer = (
  surface: ScrollWindowSurface,
  viewMode: CalendarViewMode,
): ScrollWindowBuffer => {
  const config = getScrollWindowConfig(surface, viewMode);

  return {
    before: toUnitCount(config.initialScreens.before, config.unitsPerScreen),
    after: toUnitCount(config.initialScreens.after, config.unitsPerScreen),
  };
};

export const getScrollWindowExtendUnits = (
  surface: ScrollWindowSurface,
  viewMode: CalendarViewMode,
) => {
  const config = getScrollWindowConfig(surface, viewMode);

  return toUnitCount(config.extendScreens, config.unitsPerScreen);
};
