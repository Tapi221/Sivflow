// @vitest-environment jsdom

import React, { createRef } from "react";
import type { ReactNode, RefObject } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import * as COLOR from "@/features/calendar/grid/grid.color.constants.desktop";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { CalendarGridStyle } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type MockCalendarEventChipWeekdayProps = {
  event: GoogleCalendarEvent;
  compact?: boolean;
};

const HOUR_ROW_HEIGHT_PX = 72;
const TIME_LABEL_COLOR_CLASS = "text-[var(--calendar-time-label-color)]";
const TIME_LABEL_BACKGROUND_CLASS = "bg-white";
const TIME_LABEL_FONT_CLASS = "font-medium";
const ALL_DAY_LABEL_RIGHT_PADDING_CLASS = "pr-3";
const ALL_DAY_EVENT_VERTICAL_PADDING_CLASS = "py-[0.5px]";
const OLD_ALL_DAY_EVENT_PADDING_TOP_CLASS = "pt-0.5";
const OLD_ALL_DAY_EVENT_PADDING_BOTTOM_CLASS = "pb-1";
const ALL_DAY_ACCENT_COLOR = "#34c759";
const NEXT_DAY_PREVIEW_HEIGHT_STYLE = "calc(0.5 * var(--calendar-hour-row-height))";
const FULL_WIDTH_EVENT_STYLE = "calc(100% - 2px)";

vi.mock("@/chip/eventchip/EventChip.weekday", () => ({
  CalendarEventChipWeekday: ({ event, compact = false }: MockCalendarEventChipWeekdayProps) => <div data-accent-color={event.accentColor} data-compact={String(compact)} data-ends-at={event.endsAt.toISOString()} data-testid="weekday-event-chip">{event.title}</div>,
}));

vi.mock("@/chip/toolchip/HoverEventTooltip", () => ({
  HoverEventTooltip: ({ children }: { children: ReactNode; }) => children,
}));

const createCalendarGridStyle = (): CalendarGridStyle => ({
  "--calendar-hour-row-height": `${HOUR_ROW_HEIGHT_PX}px`,
});

const createRefs = (): {
  headerScrollRef: RefObject<HTMLDivElement | null>;
  allDayScrollRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
} => ({
  headerScrollRef: createRef<HTMLDivElement>(),
  allDayScrollRef: createRef<HTMLDivElement>(),
  scrollContainerRef: createRef<HTMLDivElement>(),
});

const normalizeCssColor = (color: string): string => {
  const element = document.createElement("div");
  element.style.color = color;

  return element.style.color;
};

const createEvent = (overrides: Partial<GoogleCalendarEvent>): GoogleCalendarEvent => ({
  id: "event-1",
  calendarId: "calendar-1",
  title: "Preview event",
  startsAt: new Date(2026, 0, 2, 0, 0),
  endsAt: new Date(2026, 0, 2, 1, 0),
  isAllDay: false,
  accentColor: ALL_DAY_ACCENT_COLOR,
  ...overrides,
});

const renderWeekDayGrid = (visibleEvents: GoogleCalendarEvent[] = [], visibleDays: Date[] = [new Date(2026, 0, 1)]) => {
  const refs = createRefs();

  return render(
    <CalendarWeekDayGrid
      headerScrollRef={refs.headerScrollRef}
      allDayScrollRef={refs.allDayScrollRef}
      scrollContainerRef={refs.scrollContainerRef}
      visibleDays={visibleDays}
      visibleEvents={visibleEvents}
      calendarGridStyle={createCalendarGridStyle()}
      selectedDate={visibleDays[0] ?? new Date(2026, 0, 1)}
      onSelectDate={vi.fn()}
    />,
  );
};

const expectTimeLabelStyleClasses = (label: HTMLElement) => {
  expect(label.className).toContain(TIME_LABEL_COLOR_CLASS);
  expect(label.className).toContain(TIME_LABEL_BACKGROUND_CLASS);
  expect(label.className).toContain(TIME_LABEL_FONT_CLASS);
  expect(label.className).toContain("tabular-nums");
};

const getAllDayEventCell = (): HTMLElement => {
  const allDayLabel = screen.getByText("終日");
  const allDayEventCell = allDayLabel.nextElementSibling as HTMLElement | null;

  expect(allDayEventCell).not.toBeNull();

  return allDayEventCell as HTMLElement;
};

const getAllDayScrollContainer = (): HTMLElement => {
  const allDayLabel = screen.getByText("終日");
  const allDayScrollContainer = allDayLabel.parentElement?.parentElement as HTMLElement | null;

  expect(allDayScrollContainer).not.toBeNull();

  return allDayScrollContainer as HTMLElement;
};

const getFirstDayHourRow = (): HTMLElement => {
  const timeColumn = screen.getByText("00:00").parentElement?.parentElement as HTMLElement | null;
  const firstDayColumn = timeColumn?.nextElementSibling as HTMLElement | null;
  const firstDayHourRow = firstDayColumn?.firstElementChild as HTMLElement | null;

  expect(firstDayHourRow).not.toBeNull();

  return firstDayHourRow as HTMLElement;
};

const getFirstDayColumn = (): HTMLElement => {
  const firstDayHourRow = getFirstDayHourRow();
  const firstDayColumn = firstDayHourRow.parentElement as HTMLElement | null;

  expect(firstDayColumn).not.toBeNull();

  return firstDayColumn as HTMLElement;
};

const getTimedEventWrapper = (title: string): HTMLElement => {
  const chip = screen.getByText(title);
  const wrapper = chip.parentElement as HTMLElement | null;

  expect(wrapper).not.toBeNull();

  return wrapper as HTMLElement;
};

describe("CalendarWeekDayGrid", () => {
  afterEach(() => {
    cleanup();
  });

  it("終日ラベルと00:00ラベルを別行に描画し、00:00を上端方向にずらさない", () => {
    renderWeekDayGrid();

    const allDayLabel = screen.getByText("終日");
    const midnightLabel = screen.getByText("00:00");

    expect(allDayLabel.parentElement).not.toBe(midnightLabel.parentElement);
    expect(midnightLabel.className).not.toContain("-translate-y-1/2");
  });

  it("24:00ラベルを境界線中央に合わせ、時刻列側ではクリップしない", () => {
    renderWeekDayGrid([createEvent({ id: "next-day-event" })]);

    const bottomTimeSpacer = screen.getByTestId("weekday-time-bottom-spacer");
    const previewSpacer = screen.getByTestId("weekday-preview-bottom-spacer");
    const endOfDayLabel = screen.getByText("24:00");

    expect(endOfDayLabel.className).toContain("-translate-y-1/2");
    expect(bottomTimeSpacer.className).not.toContain("overflow-hidden");
    expect(previewSpacer.className).toContain("overflow-hidden");
  });

  it("24:00以降プレビューの表示領域を30分ぶんの高さにする", () => {
    renderWeekDayGrid([createEvent({ id: "next-day-event" })]);

    const bottomTimeSpacer = screen.getByTestId("weekday-time-bottom-spacer");
    const previewSpacer = screen.getByTestId("weekday-preview-bottom-spacer");

    expect(bottomTimeSpacer.style.height).toBe(NEXT_DAY_PREVIEW_HEIGHT_STYLE);
    expect(previewSpacer.style.height).toBe(NEXT_DAY_PREVIEW_HEIGHT_STYLE);
  });

  it("24:00以降プレビューでは0:30以降に始まるeventを描画しない", () => {
    renderWeekDayGrid([
      createEvent({ id: "visible-preview-event", title: "Visible preview", startsAt: new Date(2026, 0, 2, 0, 0), endsAt: new Date(2026, 0, 2, 0, 30) }),
      createEvent({ id: "hidden-preview-event", title: "Hidden preview", startsAt: new Date(2026, 0, 2, 0, 30), endsAt: new Date(2026, 0, 2, 1, 0) }),
    ]);

    expect(screen.getByText("Visible preview")).toBeTruthy();
    expect(screen.queryByText("Hidden preview")).toBeNull();
  });

  it("終日イベント欄は時刻列を持たず、日付列だけを横スクロール対象にする", () => {
    renderWeekDayGrid([createEvent({ isAllDay: true })]);

    const allDayScrollContainer = getAllDayScrollContainer();
    const allDayEventCell = getAllDayEventCell();

    expect(within(allDayScrollContainer).queryByText("00:00")).toBeNull();
    expect(allDayEventCell.className).toContain("min-w-0");
  });

  it("終日欄のイベントセルはラベルに寄せて表示する", () => {
    renderWeekDayGrid([createEvent({ isAllDay: true })]);

    const allDayLabel = screen.getByText("終日");
    const allDayEventCell = getAllDayEventCell();

    expect(allDayLabel.className).toContain(ALL_DAY_LABEL_RIGHT_PADDING_CLASS);
    expect(allDayEventCell.className).toContain(ALL_DAY_EVENT_VERTICAL_PADDING_CLASS);
    expect(allDayEventCell.className).not.toContain(OLD_ALL_DAY_EVENT_PADDING_TOP_CLASS);
    expect(allDayEventCell.className).not.toContain(OLD_ALL_DAY_EVENT_PADDING_BOTTOM_CLASS);
  });

  it("終日イベントの背景色を時間ありチップと同じトーンにする", () => {
    renderWeekDayGrid([createEvent({ isAllDay: true })]);

    const chip = screen.getByTestId("weekday-event-chip");

    expect(chip.dataset.accentColor).toBe(ALL_DAY_ACCENT_COLOR);
    expect(chip.dataset.compact).toBe("true");
  });

  it("時間指定イベントの横幅はセルいっぱいを基準にする", () => {
    renderWeekDayGrid([createEvent({ id: "timed-full-width", title: "Timed full width" })]);

    const wrapper = getTimedEventWrapper("Timed full width");

    expect(wrapper.style.width).toBe(FULL_WIDTH_EVENT_STYLE);
  });

  it("選択色トークンはrgbaの重ね合わせで淡い背景を作る", () => {
    const tokens = generateColorTokens(ALL_DAY_ACCENT_COLOR);

    expect(normalizeCssColor(tokens.background)).toBe(normalizeCssColor(`color-mix(in srgb, ${ALL_DAY_ACCENT_COLOR} 14%, transparent)`));
    expect(tokens.accent).toBe(ALL_DAY_ACCENT_COLOR);
    expect(tokens.border).toBe(COLOR.DEFAULT_EVENT_BORDER_COLOR);
  });
});
