// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  buildCardSetViewFlippedFaceScopeKey,
  getCardSetViewFlippedCardIds,
  setCardSetViewFlippedCardIds,
} from "@/services/cardSetViewFlippedFacePreferences";
import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";

describe("cardSetViewFlippedFacePreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses deviceScope + cardSetId as the current persistence key", () => {
    const currentKey = buildCardSetViewFlippedFaceScopeKey({
      deviceScope: "desktop",
      cardSetId: "set-1",
    });

    setCardSetViewFlippedCardIds({
      deviceScope: "desktop",
      cardSetId: "set-1",
      ids: new Set(["card-a"]),
    });

    expect(currentKey).toBe(
      `${SHARED_STORAGE_KEYS.cardSetViewFlippedFacePrefix}::desktop::set-1`,
    );
    expect(window.localStorage.getItem(currentKey)).toBe('["card-a"]');
  });

  it("persists flipped ids in localStorage", () => {
    setCardSetViewFlippedCardIds({
      deviceScope: "desktop",
      cardSetId: "set-2",
      ids: new Set(["card-a", "card-b"]),
    });

    expect(
      getCardSetViewFlippedCardIds({
        deviceScope: "desktop",
        cardSetId: "set-2",
      }),
    ).toEqual(new Set(["card-a", "card-b"]));
  });

  it("separates state by deviceScope", () => {
    setCardSetViewFlippedCardIds({
      deviceScope: "desktop",
      cardSetId: "set-3",
      ids: new Set(["card-desktop"]),
    });
    setCardSetViewFlippedCardIds({
      deviceScope: "mobile",
      cardSetId: "set-3",
      ids: new Set(["card-mobile"]),
    });

    expect(
      getCardSetViewFlippedCardIds({
        deviceScope: "desktop",
        cardSetId: "set-3",
      }),
    ).toEqual(new Set(["card-desktop"]));
    expect(
      getCardSetViewFlippedCardIds({
        deviceScope: "mobile",
        cardSetId: "set-3",
      }),
    ).toEqual(new Set(["card-mobile"]));
  });

  it("removes the persistence entry when ids become empty", () => {
    const currentKey = buildCardSetViewFlippedFaceScopeKey({
      deviceScope: "desktop",
      cardSetId: "set-4",
    });

    setCardSetViewFlippedCardIds({
      deviceScope: "desktop",
      cardSetId: "set-4",
      ids: new Set(["card-a"]),
    });

    setCardSetViewFlippedCardIds({
      deviceScope: "desktop",
      cardSetId: "set-4",
      ids: new Set(),
    });

    expect(window.localStorage.getItem(currentKey)).toBeNull();
    expect(
      getCardSetViewFlippedCardIds({
        deviceScope: "desktop",
        cardSetId: "set-4",
      }),
    ).toEqual(new Set());
  });
});
