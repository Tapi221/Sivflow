// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  buildCardSetViewFlippedFaceScopeKey,
  getCardSetViewFlippedCardIds,
  setCardSetViewFlippedCardIds,
} from "@/services/cardSetViewFlippedFaceSession";
import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";

describe("cardSetViewFlippedFaceSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
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

  it("shares state across folder changes for the same cardSetId", () => {
    setCardSetViewFlippedCardIds({
      deviceScope: "desktop",
      cardSetId: "set-4",
      ids: new Set(["card-shared"]),
    });

    expect(
      getCardSetViewFlippedCardIds({
        deviceScope: "desktop",
        cardSetId: "set-4",
        legacyScopeHint: { cardSetId: "set-4", folderId: "folder-a" },
      }),
    ).toEqual(new Set(["card-shared"]));
    expect(
      getCardSetViewFlippedCardIds({
        deviceScope: "desktop",
        cardSetId: "set-4",
        legacyScopeHint: { cardSetId: "set-4", folderId: "folder-b" },
      }),
    ).toEqual(new Set(["card-shared"]));
  });

  it("migrates legacy folder/session state to the current localStorage key", () => {
    const legacySessionKey = `${SHARED_STORAGE_KEYS.cardSetViewFlippedFacePrefix}:set-legacy:folder-1`;
    const currentKey = buildCardSetViewFlippedFaceScopeKey({
      deviceScope: "desktop",
      cardSetId: "set-legacy",
    });

    window.sessionStorage.setItem(
      legacySessionKey,
      JSON.stringify(["card-legacy"]),
    );

    const ids = getCardSetViewFlippedCardIds({
      deviceScope: "desktop",
      cardSetId: "set-legacy",
      legacyScopeHint: { cardSetId: "set-legacy", folderId: "folder-1" },
    });

    expect(ids).toEqual(new Set(["card-legacy"]));
    expect(window.localStorage.getItem(currentKey)).toBe('["card-legacy"]');
    expect(window.sessionStorage.getItem(legacySessionKey)).toBeNull();
  });
});
