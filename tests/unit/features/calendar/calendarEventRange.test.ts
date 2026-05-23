import { describe, expect, it } from "vitest";

import {
  clipEventToDay,
  eventOverlapsDay,
  eventOverlapsRange,
  getEventDateKeys,
} from "../../../../src/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "../../../../src/features/calendar/googlecalendar-integration/gcalSync.types";

const buildEvent = (
  startsAt: Date,
  endsAt: Date,
  overrides: Partial<GoogleCalendarEvent> = {},
): GoogleCalendarEvent => ({
  id: "event-1",
  calendarId: "primary",
  title: "予定",
  startsAt,
  endsAt,
  isAllDay: false,
  accentColor: "#4285f4",
  ...overrides,
});

describe("calendarEventRange", () => {
  it("開始日が範囲外でも期間が重なるイベントを検出する", () => {
    const event = buildEvent(
      new Date("2026-05-01T10:00:00.000Z"),
      new Date("2026-05-03T10:00:00.000Z"),
    );

    expect(
      eventOverlapsRange(
        event,
        new Date("2026-05-02T00:00:00.000Z"),
        new Date("2026-05-02T23:59:59.999Z"),
      ),
    ).toBe(true);
  });

  it("複数日にまたがる予定の日付キーをすべて返す", () => {
    const event = buildEvent(
      new Date("2026-05-01T22:00:00.000Z"),
      new Date("2026-05-03T01:00:00.000Z"),
    );

    expect(getEventDateKeys(event)).toEqual([
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
    ]);
  });

  it("Google Calendar の終日予定の排他的な終了日は表示日に含めない", () => {
    const event = buildEvent(
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-05-03T00:00:00.000Z"),
      { isAllDay: true },
    );

    expect(getEventDateKeys(event)).toEqual([
      "2026-05-01",
      "2026-05-02",
    ]);
  });

  it("日をまたぐ時間付き予定を対象日にクリップする", () => {
    const event = buildEvent(
      new Date("2026-05-01T22:00:00.000Z"),
      new Date("2026-05-02T02:00:00.000Z"),
    );

    const clipped = clipEventToDay(
      event,
      new Date("2026-05-02T12:00:00.000Z"),
    );

    expect(clipped?.startsAt.toISOString()).toBe("2026-05-02T00:00:00.000Z");
    expect(clipped?.endsAt.toISOString()).toBe("2026-05-02T02:00:00.000Z");
  });

  it("対象日に重ならない予定は false/null になる", () => {
    const event = buildEvent(
      new Date("2026-05-01T10:00:00.000Z"),
      new Date("2026-05-01T11:00:00.000Z"),
    );
    const day = new Date("2026-05-02T12:00:00.000Z");

    expect(eventOverlapsDay(event, day)).toBe(false);
    expect(clipEventToDay(event, day)).toBeNull();
  });
});
