// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

type WeekdayHourLabelMode = "full" | "integer";

const DESKTOP_VIEWPORT_WIDTH = 1024;
const MOBILE_WEB_VIEWPORT_WIDTH = 767;

const setWindowInnerWidth = (width: number): void => {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
};

const setDesktopRuntime = (): void => {
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
};

const clearDesktopRuntime = (): void => {
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
};

const importWeekdayHourLabelMode = async (): Promise<WeekdayHourLabelMode> => {
  vi.resetModules();
  const module = await import("@/features/calendar/grid/grid.layout.constants.desktop");

  return module.WEEKDAY_HOUR_LABEL_MODE;
};

describe("weekday hour label mode", () => {
  afterEach(() => {
    clearDesktopRuntime();
    setWindowInnerWidth(DESKTOP_VIEWPORT_WIDTH);
    vi.resetModules();
  });

  it("desktop幅では分付きの時刻ラベルmodeを使う", async () => {
    setWindowInnerWidth(DESKTOP_VIEWPORT_WIDTH);

    await expect(importWeekdayHourLabelMode()).resolves.toBe("full");
  });

  it("mobileweb幅では整数の時刻ラベルmodeを使う", async () => {
    setWindowInnerWidth(MOBILE_WEB_VIEWPORT_WIDTH);

    await expect(importWeekdayHourLabelMode()).resolves.toBe("integer");
  });

  it("desktop runtimeではmobileweb幅でも分付きの時刻ラベルmodeを使う", async () => {
    setWindowInnerWidth(MOBILE_WEB_VIEWPORT_WIDTH);
    setDesktopRuntime();

    await expect(importWeekdayHourLabelMode()).resolves.toBe("full");
  });
});
