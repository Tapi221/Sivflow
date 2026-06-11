// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCardSetViewNavigationPreference, setCardSetViewNavigationPreference } from "@/services/cardSetViewNavigationPreferences";

describe("cardSetViewNavigationPreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cardId と scrollTop を同じ cardSet scope に永続化する", () => {
    setCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-1" }, { cardId: "card-a" });
    setCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-1" }, { scrollTop: 1240 });

    expect(getCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-1" })).toEqual({
      cardId: "card-a",
      scrollTop: 1240,
      updatedAt: Date.now(),
    });
  });

  it("scrollTop 更新時に既存 cardId を保持する", () => {
    setCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-2" }, { cardId: "card-b", scrollTop: 100 });
    vi.setSystemTime(new Date("2026-06-04T00:00:01.000Z"));
    setCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-2" }, { scrollTop: 880 });

    expect(getCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-2" })).toEqual({
      cardId: "card-b",
      scrollTop: 880,
      updatedAt: Date.now(),
    });
  });

  it("cardId 更新時に既存 scrollTop を保持する", () => {
    setCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-3" }, { cardId: "card-c", scrollTop: 420 });
    vi.setSystemTime(new Date("2026-06-04T00:00:02.000Z"));
    setCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-3" }, { cardId: "card-d" });

    expect(getCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-3" })).toEqual({
      cardId: "card-d",
      scrollTop: 420,
      updatedAt: Date.now(),
    });
  });

  it("deviceScope ごとに navigation 状態を分離する", () => {
    setCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-4" }, { cardId: "card-desktop", scrollTop: 1200 });
    setCardSetViewNavigationPreference({ deviceScope: "mobile", cardSetId: "set-4" }, { cardId: "card-mobile", scrollTop: 80 });

    expect(getCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-4" })).toEqual({
      cardId: "card-desktop",
      scrollTop: 1200,
      updatedAt: Date.now(),
    });
    expect(getCardSetViewNavigationPreference({ deviceScope: "mobile", cardSetId: "set-4" })).toEqual({
      cardId: "card-mobile",
      scrollTop: 80,
      updatedAt: Date.now(),
    });
  });

  it("cardSetId がない場合は読み書きしない", () => {
    setCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: null }, { cardId: "card-a", scrollTop: 500 });

    expect(getCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: null })).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("壊れた保存値は null として扱う", () => {
    window.localStorage.setItem("flashcard-master:cardsetview-navigation-preferences:v1", "not-json");

    expect(getCardSetViewNavigationPreference({ deviceScope: "desktop", cardSetId: "set-5" })).toBeNull();
  });
});
