import { describe, expect, it } from "vitest";
import { computeMonthEventsByDay, createMonthEventIndex, getVisibleMonthEventChipCount } from "@/chip/eventchip/EventChip.month.placement";
import { DEFAULT_MONTH_ROW_HEIGHT } from "@/features/calendar/calendar.constants.desktop";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

const createEvent = ({
  id,
  startsAt,
  endsAt,
  isAllDay = false,
  title = id,
  accentColor = "#0a84ff",
}: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay?: boolean;
  title?: string;
  accentColor?: string;
}): GoogleCalendarEvent => ({
  id,
  calendarId: "calendar-1",
  title,
  startsAt,
  endsAt,
  isAllDay,
  accentColor,
});

describe("month event chip visibility", () => {
  it("デフォルト行高で3件と省略表示を表示できる", () => {
    expect(getVisibleMonthEventChipCount(4, DEFAULT_MONTH_ROW_HEIGHT)).toBe(3);
  });

  it("省略表示が不要な場合は全件表示する", () => {
    expect(getVisibleMonthEventChipCount(3, DEFAULT_MONTH_ROW_HEIGHT)).toBe(3);
  });
});

describe("computeMonthEventsByDay", () => {
  it("許可された日付だけをイベント索引に入れる", () => {
    const event = createEvent({
      id: "range",
      startsAt: new Date(2026, 0, 1),
      endsAt: new Date(2026, 0, 4),
    });

    const index = createMonthEventIndex(
      [event],
      new Set(["2026-01-02"]),
    );

    expect(index.has("2026-01-01")).toBe(false);
    expect(index.get("2026-01-02")?.map((item) => item.id)).toEqual(["range"]);
    expect(index.has("2026-01-03")).toBe(false);
  });

  it("月表示の日別イベントを並び順と表示件数つきで集約する", () => {
    const monthWeeks = [
      {
        days: [
          { key: "2026-01-01" },
          { key: "2026-01-02" },
        ],
      },
    ];
    const allDayEvent = createEvent({
      id: "all-day",
      startsAt: new Date(2026, 0, 1),
      endsAt: new Date(2026, 0, 2),
      isAllDay: true,
    });
    const lateEvent = createEvent({
      id: "late",
      startsAt: new Date(2026, 0, 1, 15, 0),
      endsAt: new Date(2026, 0, 1, 16, 0),
    });
    const earlyEvent = createEvent({
      id: "early",
      startsAt: new Date(2026, 0, 1, 8, 0),
      endsAt: new Date(2026, 0, 1, 9, 0),
    });
    const noonEvent = createEvent({
      id: "noon",
      startsAt: new Date(2026, 0, 1, 12, 0),
      endsAt: new Date(2026, 0, 1, 13, 0),
    });

    const eventsByDay = computeMonthEventsByDay({
      visibleEvents: [lateEvent, allDayEvent, noonEvent, earlyEvent],
      monthWeeks,
      monthRowHeight: DEFAULT_MONTH_ROW_HEIGHT,
    });
    const dayEvents = eventsByDay.get("2026-01-01");

    expect(dayEvents?.totalCount).toBe(4);
    expect(dayEvents?.visibleEvents.map((event) => event.id)).toEqual(["all-day", "early", "noon"]);
  });

  it("複数日にまたがる予定を対象日の両方に入れる", () => {
    const monthWeeks = [
      {
        days: [
          { key: "2026-01-01" },
          { key: "2026-01-02" },
          { key: "2026-01-03" },
        ],
      },
    ];
    const multiDayEvent = createEvent({
      id: "multi-day",
      startsAt: new Date(2026, 0, 1, 23, 30),
      endsAt: new Date(2026, 0, 2, 0, 30),
    });

    const eventsByDay = computeMonthEventsByDay({
      visibleEvents: [multiDayEvent],
      monthWeeks,
      monthRowHeight: DEFAULT_MONTH_ROW_HEIGHT,
    });

    expect(eventsByDay.get("2026-01-01")?.visibleEvents.map((event) => event.id)).toEqual(["multi-day"]);
    expect(eventsByDay.get("2026-01-02")?.visibleEvents.map((event) => event.id)).toEqual(["multi-day"]);
    expect(eventsByDay.has("2026-01-03")).toBe(false);
  });
});
