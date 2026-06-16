import { describe, expect, it } from "vitest";
import { computeEventLayout } from "@web-renderer/chip/eventchip/EventChip.weekday.placement";
import type { LayoutEvent } from "@web-renderer/chip/eventchip/EventChip.weekday.placement";

const getLefts = (events: LayoutEvent[]) =>
  events.map((event) => computeEventLayout(events).get(event.id)?.left);

describe("computeEventLayout", () => {
  it("同じ開始時刻のイベントを入力順に依存せず安定配置する", () => {
    const events: LayoutEvent[] = [
      { id: "b", startMinutes: 60, endMinutes: 90 },
      { id: "a", startMinutes: 60, endMinutes: 90 },
      { id: "c", startMinutes: 60, endMinutes: 90 },
    ];

    const reversed = [...events].reverse();

    expect(getLefts(events)).toEqual([1 / 3, 0, 2 / 3]);
    expect(computeEventLayout(events).get("a")?.left).toBe(
      computeEventLayout(reversed).get("a")?.left,
    );
    expect(computeEventLayout(events).get("b")?.left).toBe(
      computeEventLayout(reversed).get("b")?.left,
    );
    expect(computeEventLayout(events).get("c")?.left).toBe(
      computeEventLayout(reversed).get("c")?.left,
    );
  });

  it("開始時刻が同じ場合は長いイベントを先に固定する", () => {
    const shortFirst: LayoutEvent[] = [
      { id: "short", startMinutes: 60, endMinutes: 90 },
      { id: "long", startMinutes: 60, endMinutes: 120 },
    ];

    const longFirst = [...shortFirst].reverse();

    expect(computeEventLayout(shortFirst).get("long")?.left).toBe(0);
    expect(computeEventLayout(longFirst).get("long")?.left).toBe(0);
    expect(computeEventLayout(shortFirst).get("short")?.left).toBe(0.5);
    expect(computeEventLayout(longFirst).get("short")?.left).toBe(0.5);
  });
});
