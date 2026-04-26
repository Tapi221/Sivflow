import { describe, expect, it } from "vitest";

import { formatCardSetFileDisplayName } from "@/features/deckFile/domain/cardSetFileDisplayName";

describe("formatCardSetFileDisplayName", () => {
  it("カードセット表示名に .mfdeck を付ける", () => {
    expect(formatCardSetFileDisplayName("データベース方式")).toBe(
      "データベース方式.mfdeck",
    );
  });

  it("末尾の セット を表示名から外す", () => {
    expect(formatCardSetFileDisplayName("データベース方式セット")).toBe(
      "データベース方式.mfdeck",
    );
  });

  it("既に .mfdeck がある場合は重複させない", () => {
    expect(formatCardSetFileDisplayName("データベース方式.mfdeck")).toBe(
      "データベース方式.mfdeck",
    );
  });
});
