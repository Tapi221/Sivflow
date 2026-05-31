import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SCHEDULE_NAVIGATION_STORAGE_KEY, persistScheduleNavigationState, readStoredScheduleNavigationState } from "@/features/calendar/scheduleNavigationPersistence";

const originalWindow = globalThis.window;

const installTestWindow = () => {
  const localStorage = new Map<string, string>();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => localStorage.get(key) ?? null,
        setItem: (key: string, value: string) => { localStorage.set(key, value); },
      },
    },
  });

  return localStorage;
};

beforeEach(() => {
  installTestWindow();
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});

describe("scheduleNavigationPersistence", () => {
  it("表示状態を localStorage に保存して読み戻す", () => {
    persistScheduleNavigationState({
      currentDate: new Date("2024-11-25T00:00:00.000Z"),
      selectedDate: new Date("2024-11-27T00:00:00.000Z"),
      monthTitleDate: new Date("2024-11-01T00:00:00.000Z"),
      selectedViewMode: "week",
    });

    const stored = readStoredScheduleNavigationState();

    expect(stored?.currentDate?.toISOString()).toBe("2024-11-25T00:00:00.000Z");
    expect(stored?.selectedDate?.toISOString()).toBe("2024-11-27T00:00:00.000Z");
    expect(stored?.monthTitleDate?.toISOString()).toBe("2024-11-01T00:00:00.000Z");
    expect(stored?.selectedViewMode).toBe("week");
  });

  it("複数表示モードの保存値を読み戻す", () => {
    window.localStorage.setItem(SCHEDULE_NAVIGATION_STORAGE_KEY, JSON.stringify({
      currentDate: "2024-11-25T00:00:00.000Z",
      selectedDate: "2024-11-27T00:00:00.000Z",
      monthTitleDate: "2024-11-01T00:00:00.000Z",
      selectedViewMode: ["days", "pieChart"],
    }));

    expect(readStoredScheduleNavigationState()?.selectedViewMode).toEqual(["days", "pieChart"]);
  });

  it("壊れた保存値は null として扱う", () => {
    window.localStorage.setItem(SCHEDULE_NAVIGATION_STORAGE_KEY, "not-json");

    expect(readStoredScheduleNavigationState()).toBeNull();
  });

  it("無効な日付と表示モードは破棄する", () => {
    window.localStorage.setItem(SCHEDULE_NAVIGATION_STORAGE_KEY, JSON.stringify({
      currentDate: "invalid-date",
      selectedDate: "2024-11-27T00:00:00.000Z",
      monthTitleDate: 123,
      selectedViewMode: ["month", "unknown"],
    }));

    const stored = readStoredScheduleNavigationState();

    expect(stored?.currentDate).toBeUndefined();
    expect(stored?.selectedDate?.toISOString()).toBe("2024-11-27T00:00:00.000Z");
    expect(stored?.monthTitleDate).toBeUndefined();
    expect(stored?.selectedViewMode).toBeUndefined();
  });
});
