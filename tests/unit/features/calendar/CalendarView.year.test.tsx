// @vitest-environment jsdom

import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarYearView } from "@/features/calendar/grid/CalendarView.year";

const setReadonlyNumber = (element: Element, property: string, value: number) => {
  Object.defineProperty(element, property, {
    configurable: true,
    writable: true,
    value,
  });
};

describe("CalendarYearView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期表示で現在年から描画し、下端付近で表示年を追加する", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const onRenderedRangeChange = vi.fn();

    const { container } = render(
      <CalendarYearView
        yearDate={new Date(2026, 0, 1)}
        selectedDate={new Date(2026, 0, 1)}
        visibleEvents={[]}
        onSelectDate={vi.fn()}
        onRenderedRangeChange={onRenderedRangeChange}
      />,
    );

    const scroller = container.querySelector(".calendar-year-view");
    expect(scroller).toBeInstanceOf(HTMLElement);

    let latestRange = onRenderedRangeChange.mock.calls.at(-1)?.[0] as
      | { start: Date; end: Date }
      | undefined;

    expect(latestRange?.start.getFullYear()).toBe(2026);
    expect(latestRange?.end.getFullYear()).toBe(2032);
    expect(container.textContent).toContain("2026年");

    setReadonlyNumber(scroller!, "clientHeight", 1000);
    setReadonlyNumber(scroller!, "scrollHeight", 304000);
    setReadonlyNumber(scroller!, "scrollTop", 303000);

    act(() => {
      fireEvent.scroll(scroller!);
    });

    latestRange = onRenderedRangeChange.mock.calls.at(-1)?.[0] as
      | { start: Date; end: Date }
      | undefined;

    expect(latestRange?.start.getFullYear()).toBe(2026);
    expect(latestRange?.end.getFullYear()).toBe(2035);
  }, 60_000);
});
