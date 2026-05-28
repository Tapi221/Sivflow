import { describe, expect, it } from "vitest";
import { buildListPlacementDays, buildListVirtualMetrics, getListVirtualRange, LIST_DAY_GAP_PX, LIST_DAY_SECTION_MIN_HEIGHT_PX, LIST_EVENT_ROW_GAP_PX, LIST_EVENT_ROW_HEIGHT_PX } from "@/chip/eventchip/EventChip.list.placement";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

const createEvent = ({
  id,
  startsAt,
  endsAt,
  isAllDay = false,
  title = id,
}: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay?: boolean;
  title?: string;
}): GoogleCalendarEvent => ({
  id,
  calendarId: "calendar-1",
  title,
  startsAt,
  endsAt,
  isAllDay,
  accentColor: "#0a84ff",
});

describe("buildListPlacementDays", () => {
  it("日をまたぐ時間指定予定を日ごとに切り出して並べる", () => {
    const day1 = new Date(2026, 0, 1);
    const day2 = new Date(2026, 0, 2);
    const multiDayEvent = createEvent({
      id: "multi-day",
      startsAt: new Date(2026, 0, 1, 23, 30),
      endsAt: new Date(2026, 0, 2, 0, 30),
    });
    const earlyEvent = createEvent({
      id: "early",
      startsAt: new Date(2026, 0, 2, 0, 10),
      endsAt: new Date(2026, 0, 2, 0, 20),
    });

    const days = buildListPlacementDays({
      days: [day1, day2],
      events: [multiDayEvent, earlyEvent],
      selectedDate: day1,
    });

    expect(days[0].events).toHaveLength(1);
    expect(days[0].events[0].id).toBe("multi-day");
    expect(days[0].events[0].startsAt).toEqual(new Date(2026, 0, 1, 23, 30));
    expect(days[0].events[0].endsAt).toEqual(new Date(2026, 0, 2, 0, 0));
    expect(days[1].events.map((event) => event.id)).toEqual(["multi-day", "early"]);
    expect(days[1].events[0].startsAt).toEqual(new Date(2026, 0, 2, 0, 0));
    expect(days[1].events[0].endsAt).toEqual(new Date(2026, 0, 2, 0, 30));
  });
});

describe("buildListVirtualMetrics", () => {
  it("リスト行の高さとgapから仮想スクロール高さを計算する", () => {
    const day1 = new Date(2026, 0, 1);
    const day2 = new Date(2026, 0, 2);
    const day3 = new Date(2026, 0, 3);
    const events = [0, 1, 2, 3, 4, 5, 6, 7].map((index) =>
      createEvent({
        id: `event-${index}`,
        startsAt: new Date(2026, 0, 2, index, 0),
        endsAt: new Date(2026, 0, 2, index, 30),
      }),
    );

    const days = buildListPlacementDays({
      days: [day1, day2, day3],
      events,
      selectedDate: day1,
    });
    const metrics = buildListVirtualMetrics(days);
    const expandedDayHeight = events.length * LIST_EVENT_ROW_HEIGHT_PX + (events.length - 1) * LIST_EVENT_ROW_GAP_PX;

    expect(metrics.offsets).toEqual([
      0,
      LIST_DAY_SECTION_MIN_HEIGHT_PX + LIST_DAY_GAP_PX,
      LIST_DAY_SECTION_MIN_HEIGHT_PX + LIST_DAY_GAP_PX + expandedDayHeight + LIST_DAY_GAP_PX,
    ]);
    expect(metrics.heights).toEqual([
      LIST_DAY_SECTION_MIN_HEIGHT_PX + LIST_DAY_GAP_PX,
      expandedDayHeight + LIST_DAY_GAP_PX,
      LIST_DAY_SECTION_MIN_HEIGHT_PX,
    ]);
    expect(metrics.totalHeight).toBe(
      LIST_DAY_SECTION_MIN_HEIGHT_PX + LIST_DAY_GAP_PX + expandedDayHeight + LIST_DAY_GAP_PX + LIST_DAY_SECTION_MIN_HEIGHT_PX,
    );
  });
});

describe("getListVirtualRange", () => {
  it("表示範囲とoverscanに入る日だけを返す", () => {
    const metrics = {
      heights: [1000, 1000, 1000, 1000, 1000, 1000],
      offsets: [0, 1000, 2000, 3000, 4000, 5000],
      totalHeight: 6000,
    };

    expect(getListVirtualRange(metrics, 0, 500)).toEqual({ start: 0, end: 4 });
    expect(getListVirtualRange(metrics, 3000, 500)).toEqual({ start: 0, end: 6 });
  });
});
