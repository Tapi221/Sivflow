import { format } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  CALENDAR_MONTH_GRID_CELL_COUNT,
  buildCalendarMonthGridDays,
} from "@/features/calendar/model/monthGrid";

const toKey = (date: Date) => format(date, "yyyy-MM-dd");

describe("monthGrid", () => {
  it("2026年4月を日曜始まりの42セルで構築する", () => {
    const days = buildCalendarMonthGridDays(new Date(2026, 3, 1));

    expect(days).toHaveLength(CALENDAR_MONTH_GRID_CELL_COUNT);
    expect(days[0]?.key).toBe("2026-03-29");
    expect(days[3]?.key).toBe("2026-04-01");
    expect(days[32]?.key).toBe("2026-04-30");
    expect(days[33]?.key).toBe("2026-05-01");
    expect(days[34]?.key).toBe("2026-05-02");
    expect(days[41]?.key).toBe("2026-05-09");
  });

  it("当月日と月外日を判定する", () => {
    const days = buildCalendarMonthGridDays(new Date(2026, 3, 27));
    const march31 = days.find((day) => toKey(day.date) === "2026-03-31");
    const april1 = days.find((day) => toKey(day.date) === "2026-04-01");
    const april30 = days.find((day) => toKey(day.date) === "2026-04-30");
    const may1 = days.find((day) => toKey(day.date) === "2026-05-01");

    expect(march31?.isCurrentMonth).toBe(false);
    expect(april1?.isCurrentMonth).toBe(true);
    expect(april30?.isCurrentMonth).toBe(true);
    expect(may1?.isCurrentMonth).toBe(false);
  });

  it("月初セルを判定する", () => {
    const days = buildCalendarMonthGridDays(new Date(2026, 3, 1));
    const april1 = days.find((day) => day.key === "2026-04-01");
    const may1 = days.find((day) => day.key === "2026-05-01");
    const april2 = days.find((day) => day.key === "2026-04-02");

    expect(april1?.isMonthStart).toBe(true);
    expect(may1?.isMonthStart).toBe(true);
    expect(april2?.isMonthStart).toBe(false);
  });
});
