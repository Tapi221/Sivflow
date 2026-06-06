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
const OLD_ALL_DAY_EVENT_PADDING_TOP_CLASS = "pt-[2px]";
const OLD_ALL_DAY_EVENT_PADDING_BOTTOM_CLASS = "pb-1";
const ALL_DAY_ACCENT_COLOR = "#34c759";
const NEXT_DAY_PREVIEW_HEIGHT_STYLE = "calc(0.5 * var(--calendar-hour-row-height))";
const FULL_WIDTH_EVENT_STYLE = "calc(100% - 2px)";

vi.mock("@/chip/eventchip/EventChip.weekday", () => ({
  CalendarEventChipWeekday: ({ event, compact = false }: MockCalendarEventChipWeekdayProps) => <div data-accent-color={event.accentColor} data-compact={String(compact)} data-ends-at={event.endsAt.toISOString()} data-testid="weekday-event-chip">{event.title}</div>,
}));

vi.mock("@/chip/toolchip/HoverEventTooltip", () => ({
  HoverEventTooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
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

    const previewSpacer = screen.getByTestId("weekday-preview-bottom-spacer");

    expect(within(previewSpacer).getByText("Visible preview")).not.toBeNull();
    expect(within(previewSpacer).queryByText("Hidden preview")).toBeNull();
  });

  it("24:00以降プレビューのeventは表示範囲で切り詰めず、元の終了時刻を渡す", () => {
    renderWeekDayGrid([
      createEvent({ id: "long-preview-event", title: "Long preview", startsAt: new Date(2026, 0, 2, 0, 0), endsAt: new Date(2026, 0, 2, 1, 30) }),
    ]);

    const previewSpacer = screen.getByTestId("weekday-preview-bottom-spacer");
    const previewChip = within(previewSpacer).getByTestId("weekday-event-chip");

    expect(previewChip.getAttribute("data-ends-at")).toBe(new Date(2026, 0, 2, 1, 30).toISOString());
  });

  it("短時間eventは最低表示高さではなく実時刻の重なりだけで横並び判定する", () => {
    renderWeekDayGrid([
      createEvent({ id: "short-a", title: "Short A", startsAt: new Date(2026, 0, 1, 9, 0), endsAt: new Date(2026, 0, 1, 9, 5) }),
      createEvent({ id: "short-b", title: "Short B", startsAt: new Date(2026, 0, 1, 9, 6), endsAt: new Date(2026, 0, 1, 9, 11) }),
    ]);

    expect(getTimedEventWrapper("Short A").style.width).toBe(FULL_WIDTH_EVENT_STYLE);
    expect(getTimedEventWrapper("Short B").style.width).toBe(FULL_WIDTH_EVENT_STYLE);
  });

  it("時刻ラベルの色、背景、数字用スタイルを維持する", () => {
    renderWeekDayGrid();

    expectTimeLabelStyleClasses(screen.getByText("00:00"));
    expectTimeLabelStyleClasses(screen.getByText("01:00"));
    expectTimeLabelStyleClasses(screen.getByText("24:00"));
  });

  it("終日ラベルの文字色、太さ、右側paddingを時刻ラベル列に合わせる", () => {
    renderWeekDayGrid();

    const allDayLabel = screen.getByText("終日");

    expect(allDayLabel.className).toContain(TIME_LABEL_COLOR_CLASS);
    expect(allDayLabel.className).toContain(TIME_LABEL_FONT_CLASS);
    expect(allDayLabel.className).toContain("tabular-nums");
    expect(allDayLabel.className).toContain(ALL_DAY_LABEL_RIGHT_PADDING_CLASS);
    expect(allDayLabel.className).not.toContain("px-2");
  });

  it("終日イベントセルの上下paddingを0.5pxにする", () => {
    renderWeekDayGrid();

    const allDayEventCell = getAllDayEventCell();

    expect(allDayEventCell.className).toContain(ALL_DAY_EVENT_VERTICAL_PADDING_CLASS);
    expect(allDayEventCell.className).not.toContain(OLD_ALL_DAY_EVENT_PADDING_TOP_CLASS);
    expect(allDayEventCell.className).not.toContain(OLD_ALL_DAY_EVENT_PADDING_BOTTOM_CLASS);
  });

  it("日付ヘッダーと時刻ラベル境界には縦線を入れず、日付間だけ縦線を入れる", () => {
    renderWeekDayGrid([], [new Date(2026, 0, 1), new Date(2026, 0, 2)]);

    const dayHeaderCell = screen.getByRole("button", { name: /1\s*木/ }).parentElement as HTMLElement | null;
    const allDayEventCell = getAllDayEventCell();
    const firstDayColumn = getFirstDayColumn();
    const secondAllDayEventCell = allDayEventCell.nextElementSibling as HTMLElement | null;
    const secondDayColumn = firstDayColumn.nextElementSibling as HTMLElement | null;

    expect(dayHeaderCell?.className).not.toContain("border-l");
    expect(allDayEventCell.className).not.toContain("border-l");
    expect(firstDayColumn.className).not.toContain("border-l");
    expect(secondAllDayEventCell?.className).toContain("border-l");
    expect(secondDayColumn?.className).toContain("border-l");
    expect(secondAllDayEventCell?.style.borderColor).toBe(normalizeCssColor(COLOR.WEEKDAY_COLOR_BORDER_SUB));
    expect(secondDayColumn?.style.borderColor).toBe(normalizeCssColor(COLOR.WEEKDAY_COLOR_BORDER_SUB));
  });

  it("終日の下線を終日行の前面レイヤーに描画し、スクロール中も時刻グリッドより前に出す", () => {
    renderWeekDayGrid();

    const midnightLabelRow = screen.getByText("00:00").parentElement as HTMLElement | null;
    const allDayLabel = screen.getByText("終日");
    const allDayEventCell = getAllDayEventCell();
    const allDayScrollContainer = getAllDayScrollContainer();
    const firstDayHourRow = getFirstDayHourRow();

    expect(allDayLabel.className).not.toContain("border-b");
    expect(midnightLabelRow?.className).not.toContain("border-b");
    expect(allDayEventCell.className).not.toContain("border-b");
    expect(allDayScrollContainer.className).toContain("border-b");
    expect(allDayScrollContainer.className).toContain("z-20");
    expect(allDayScrollContainer.className).toContain("bg-white");
    expect(firstDayHourRow.className).toContain("border-b");
    expect(allDayScrollContainer.style.borderColor).toBe(normalizeCssColor(COLOR.WEEKDAY_COLOR_BORDER_SUB));
    expect(firstDayHourRow.style.borderColor).toBe(normalizeCssColor(COLOR.WEEKDAY_COLOR_BORDER_SUB));
  });

  it("終日イベントの色トークンをそのまま使う", () => {
    const allDayEvent = createEvent({ id: "all-day-event", title: "All day event", startsAt: new Date(2026, 0, 1, 0, 0), endsAt: new Date(2026, 0, 2, 0, 0), isAllDay: true, accentColor: ALL_DAY_ACCENT_COLOR });
    const tokens = generateColorTokens(ALL_DAY_ACCENT_COLOR);

    renderWeekDayGrid([allDayEvent]);

    const allDayChip = screen.getByText("All day event");

    expect(allDayChip.style.background).toBe(normalizeCssColor(tokens.bg));
    expect(allDayChip.style.color).toBe(normalizeCssColor(tokens.text));
  });
});
