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

  it("上下端の検知範囲が重なる位置でもスクロール方向の年範囲だけを拡張する", async () => {
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

    setReadonlyNumber(scroller!, "clientHeight", 1000);
    setReadonlyNumber(scroller!, "scrollHeight", 5000);
    setReadonlyNumber(scroller!, "scrollTop", 1900);

    act(() => {
      fireEvent.scroll(scroller!);
    });

    const latestRange = onRenderedRangeChange.mock.calls.at(-1)?.[0] as
      | { start: Date; end: Date }
      | undefined;

    expect(latestRange?.start.getFullYear()).toBe(2021);
    expect(latestRange?.end.getFullYear()).toBe(2035);
  });
});
