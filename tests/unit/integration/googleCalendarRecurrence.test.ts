import { describe, expect, it } from "vitest";

import { parseGoogleRecurrenceRule, serializeGoogleRecurrenceRule } from "@/integration/googlecalendar-integration/gcalRecurrence";

describe("google calendar recurrence mapping", () => {
  it("serializes a biweekly weekday recurrence", () => {
    expect(serializeGoogleRecurrenceRule({
      daysOfWeek: [1],
      frequency: "weekly",
      interval: 2,
    })).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO");
  });

  it("parses a yearly recurrence with month and day anchors", () => {
    const rule = parseGoogleRecurrenceRule(["RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=7;COUNT=3"]);

    expect(rule).toEqual({
      daysOfMonth: [7],
      frequency: "yearly",
      monthsOfYear: [6],
      occurrence: 3,
    });
  });

  it("round-trips a recurrence ending on a date", () => {
    const endDate = new Date(Date.UTC(2026, 5, 7, 12, 30, 0));
    const serialized = serializeGoogleRecurrenceRule({
      endDate,
      frequency: "daily",
    });

    expect(serialized).toBe("RRULE:FREQ=DAILY;UNTIL=20260607T123000Z");
    expect(parseGoogleRecurrenceRule([serialized!])?.endDate?.toISOString()).toBe("2026-06-07T12:30:00.000Z");
  });
});
