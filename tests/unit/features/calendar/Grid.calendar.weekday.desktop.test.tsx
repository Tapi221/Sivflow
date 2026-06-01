// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { CalendarGridStyle, CalendarTimedEventMoveHandler } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type ResizeObserverCallbackMock = ConstructorParameters<typeof ResizeObserver>[0];

const ACCOUNT_ID = "calendar-grid-dnd-test";
const CALENDAR_ID = "calendar-grid";
const HOUR_ROW_HEIGHT = 72;
const CALENDAR_GRID_STYLE: CalendarGridStyle = { "--calendar-hour-row-height": `${HOUR_ROW_HEIGHT}px` };
const VISIBLE_DAY = new Date(2026, 5, 3);
const OVERLAP_EVENTS: GoogleCalendarEvent[] = [
  {
    id: "overlap-a",
    accountId: ACCOUNT_ID,
    calendarId: CALENDAR_ID,
    title: "重なり確認 A",
    startsAt: new Date(2026, 5, 3, 3, 15),
    endsAt: new Date(2026, 5, 3, 4, 30),
    isAllDay: false,
    accentColor: "#a78bfa",
  },
  {
    id: "overlap-b",
    accountId: ACCOUNT_ID,
    calendarId: CALENDAR_ID,
    title: "重なり確認 B",
    startsAt: new Date(2026, 5, 3, 3, 45),
    endsAt: new Date(2026, 5, 3, 4, 15),
    isAllDay: false,
    accentColor: "#ec4899",
  },
];

const createDomRect = (left: number, top: number, width: number, height: number): DOMRect => ({
  bottom: top + height,
  height,
  left,
  right: left + width,
  toJSON: () => ({}),
  top,
  width,
  x: left,
  y: top,
});

const setElementRect = (element: Element, rect: DOMRect) => {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => rect,
  });
};

const findAncestor = (element: HTMLElement, predicate: (candidate: HTMLElement) => boolean): HTMLElement => {
  let current = element.parentElement;

  while (current) {
    if (predicate(current)) return current;
    current = current.parentElement;
  }

  throw new Error("ancestor not found");
};

const findEventWrapper = (element: HTMLElement): HTMLElement => findAncestor(element, (candidate) => candidate.classList.contains("absolute") && candidate.classList.contains("z-10") && candidate.classList.contains("transition-opacity"));

const findDayColumn = (element: HTMLElement): HTMLElement => findAncestor(element, (candidate) => candidate.className.includes("relative min-w-0 bg-white") && !candidate.classList.contains("absolute"));

class ResizeObserverMock {
  readonly callback: ResizeObserverCallbackMock;

  constructor(callback: ResizeObserverCallbackMock) {
    this.callback = callback;
  }

  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
}

const renderGrid = (onMoveTimedEvent: CalendarTimedEventMoveHandler = vi.fn()) => render(
  <CalendarWeekDayGrid
    headerScrollRef={createRef<HTMLDivElement>()}
    allDayScrollRef={createRef<HTMLDivElement>()}
    scrollContainerRef={createRef<HTMLDivElement>()}
    visibleDays={[VISIBLE_DAY]}
    visibleEvents={OVERLAP_EVENTS}
    calendarGridStyle={CALENDAR_GRID_STYLE}
    selectedDate={VISIBLE_DAY}
    onMoveTimedEvent={onMoveTimedEvent}
  />,
);

describe("CalendarWeekDayGrid", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      value: ResizeObserverMock,
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => true),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ドラッグ中の preview を通常の重なりレイアウトから切り離して固定幅 overlay で描画する", () => {
    const onMoveTimedEvent = vi.fn();
    const { container } = renderGrid(onMoveTimedEvent);
    const title = screen.getAllByText("重なり確認 A")[0] as HTMLElement;
    const eventWrapper = findEventWrapper(title);
    const dayColumn = findDayColumn(title);
    const originalTop = eventWrapper.style.top;

    setElementRect(dayColumn, createDomRect(100, 0, 240, HOUR_ROW_HEIGHT * 24));
    setElementRect(eventWrapper, createDomRect(103, HOUR_ROW_HEIGHT * 3.25, 116, HOUR_ROW_HEIGHT * 1.25));

    act(() => {
      fireEvent.pointerDown(eventWrapper, {
        button: 0,
        clientX: 180,
        clientY: HOUR_ROW_HEIGHT * 3.25 + 10,
        pointerId: 1,
      });
      fireEvent.pointerMove(window, {
        clientX: 180,
        clientY: HOUR_ROW_HEIGHT * 4.5 + 10,
        pointerId: 1,
      });
    });

    const dragPreview = container.querySelector(".transition-none") as HTMLElement | null;

    expect(dragPreview).not.toBeNull();
    expect(dragPreview?.style.left).toBe("3px");
    expect(dragPreview?.style.width).toBe("calc(100% - 7px)");
    expect(dragPreview?.style.pointerEvents).toBe("none");
    expect(dragPreview?.style.top).toBe("calc(4.5 * var(--calendar-hour-row-height))");
    expect(eventWrapper.style.top).toBe(originalTop);
    expect(onMoveTimedEvent).not.toHaveBeenCalled();
  });
});
