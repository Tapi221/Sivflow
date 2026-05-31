// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistScheduleCalendarScrollTop, readStoredScheduleCalendarScrollTop } from "@/features/calendar/scheduleNavigationPersistence";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";
import { useCalendarScrollController } from "@/features/scroll/schedule/hooks/useCalendarScrollController";

type TestHarnessProps = {
  selectedViewMode?: CalendarViewMode;
};

const VISIBLE_DAYS = [
  new Date("2024-07-22T00:00:00.000Z"),
  new Date("2024-07-23T00:00:00.000Z"),
  new Date("2024-07-24T00:00:00.000Z"),
  new Date("2024-07-25T00:00:00.000Z"),
  new Date("2024-07-26T00:00:00.000Z"),
  new Date("2024-07-27T00:00:00.000Z"),
  new Date("2024-07-28T00:00:00.000Z"),
];
const CALENDAR_BUFFER = { before: 0, after: 0 };

const TestHarness = ({ selectedViewMode = "week" }: TestHarnessProps) => {
  const { scrollContainerRef } = useCalendarScrollController({
    selectedViewMode,
    visibleDays: VISIBLE_DAYS,
    calendarBuffer: CALENDAR_BUFFER,
    viewportWidth: 700,
    calendarDayColumnWidth: 100,
    onVisibleDateChange: () => undefined,
    scrollTargetToken: 0,
  });

  return React.createElement("div", { "data-testid": "calendar-scroll-container", ref: scrollContainerRef });
};

describe("useCalendarScrollController", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("週表示の初期描画で保存済みの縦スクロール位置を復元する", () => {
    persistScheduleCalendarScrollTop(480);

    render(React.createElement(TestHarness, { selectedViewMode: "week" }));

    expect(screen.getByTestId("calendar-scroll-container").scrollTop).toBe(480);
  });

  it("週表示のスクロール時に縦スクロール位置を保存する", () => {
    render(React.createElement(TestHarness, { selectedViewMode: "week" }));

    const scroller = screen.getByTestId("calendar-scroll-container");
    scroller.scrollTop = 612;
    fireEvent.scroll(scroller);

    expect(readStoredScheduleCalendarScrollTop()).toBe(612);
  });

  it("月表示では週表示用の縦スクロール位置を復元・上書きしない", () => {
    persistScheduleCalendarScrollTop(360);

    render(React.createElement(TestHarness, { selectedViewMode: "month" }));

    const scroller = screen.getByTestId("calendar-scroll-container");
    expect(scroller.scrollTop).toBe(0);

    scroller.scrollTop = 240;
    fireEvent.scroll(scroller);

    expect(readStoredScheduleCalendarScrollTop()).toBe(360);
  });
});
