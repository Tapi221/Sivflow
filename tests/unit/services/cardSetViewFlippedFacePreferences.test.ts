// @vitest-environment jsdom
import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";
import { beforeEach, describe, expect, it } from "vitest";
import { buildCardSetViewFlippedFaceScopeKey, getCardSetViewFlippedCardIds, setCardSetViewFlippedCardIds } from "@/services/cardSetViewFlippedFacePreferences";

describe("cardSetViewFlippedFacePreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("deviceScope + cardSetId を現在の永続化 key として使用する", () => {
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
    expect(window.localStorage.getItem(currentKey)).toBe(JSON.stringify(["card-a"]));
  });

  it("flipped ids を localStorage に永続化する", () => {
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

  it("deviceScope ごとに状態を分離する", () => {
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

  it("ids が空になったら永続化 entry を削除する", () => {
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
