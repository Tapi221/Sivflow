import { describe, expect, it } from "vitest";
import { WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX, getWeekdayTimedEventFrame, getWeekdayTimedEventPositionStyle } from "../../src/features/calendar/grid/weekdayTimeGridGeometry";
import { DEFAULT_HOUR_ROW_HEIGHT } from "../../src/features/calendar/calendar.constants.desktop";
import { WEEKDAY_HOURS, WEEKDAY_MINUTES_PER_HOUR } from "../../src/features/calendar/grid/grid.layout.constants.desktop";
import { layoutCalendarTimeGridEvents } from "../../packages/core/src/calendar/timeGridLayout";
import type { CalendarEvent } from "../../packages/core/src/calendar/calendarEvent.types";

const WEEKDAY_VISUAL_MIN_LAYOUT_MINUTES = Math.ceil((WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX / DEFAULT_HOUR_ROW_HEIGHT) * WEEKDAY_MINUTES_PER_HOUR);
const NEXT_DAY_PREVIEW_HOURS = 1;

const buildEvent = ({
  id,
  startsAt,
  endsAt,
}: {
  id: string;
  startsAt: Date;
  endsAt: Date;
}): CalendarEvent => ({
  id,
  calendarId: "calendar-1",
  title: id,
  startsAt,
  endsAt,
  isAllDay: false,
  accentColor: "#2563eb",
});

describe("weekday time grid geometry", () => {
  it("24:00 をまたぐ当日側 event は minHeight を抑制して下端からはみ出さない", () => {
    const [entry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "crosses-midnight",
          startsAt: new Date(2026, 3, 12, 23, 55),
          endsAt: new Date(2026, 3, 13, 0, 20),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
      minimumEventDurationMinutes: WEEKDAY_VISUAL_MIN_LAYOUT_MINUTES,
    });

    const frame = getWeekdayTimedEventFrame(entry);
    const defaultStyle = getWeekdayTimedEventPositionStyle(entry);
    const suppressedStyle = getWeekdayTimedEventPositionStyle(entry, WEEKDAY_HOURS, { suppressMinHeight: entry.endsAfterRange });

    expect(entry.endsAfterRange).toBe(true);
    expect(frame.topHours).toBeCloseTo(23 + 55 / 60, 6);
    expect(frame.heightHours).toBeCloseTo(5 / 60, 6);
    expect(defaultStyle.minHeight).toBe("18px");
    expect(suppressedStyle.minHeight).toBe("0px");
  });

  it("24:00 以降プレビューは 1 時間範囲で 0 時台 event の位置と高さを計算する", () => {
    const [entry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "next-day-preview",
          startsAt: new Date(2026, 3, 13, 0, 0),
          endsAt: new Date(2026, 3, 13, 0, 30),
        }),
      ],
      rangeStart: new Date(2026, 3, 13, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 1, 0),
      layoutMode: "no-overlap",
      minimumEventDurationMinutes: WEEKDAY_VISUAL_MIN_LAYOUT_MINUTES,
    });

    const frame = getWeekdayTimedEventFrame(entry, NEXT_DAY_PREVIEW_HOURS);
    const style = getWeekdayTimedEventPositionStyle(entry, NEXT_DAY_PREVIEW_HOURS);

    expect(entry.startsBeforeRange).toBe(false);
    expect(entry.endsAfterRange).toBe(false);
    expect(frame.topHours).toBe(0);
    expect(frame.heightHours).toBeCloseTo(0.5, 6);
    expect(style.top).toBe("calc(0 * var(--calendar-hour-row-height))");
    expect(style.height).toBe("calc(0.5 * var(--calendar-hour-row-height))");
    expect(style.minHeight).toBe("18px");
  });
});
