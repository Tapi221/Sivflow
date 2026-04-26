import { describe, expect, it } from "vitest";

import { formatCardFileDisplayName } from "@/features/cardFile/domain/cardFileDisplayName";

describe("formatCardFileDisplayName", () => {
  it("カード表示名に .mfcard を付ける", () => {
    expect(formatCardFileDisplayName("問1(1)")).toBe("問1(1).mfcard");
  });

  it("既に .mfcard がある場合は重複させない", () => {
    expect(formatCardFileDisplayName("Q2.mfcard")).toBe("Q2.mfcard");
  });

  it("空名は無題のカード.mfcard にする", () => {
    expect(formatCardFileDisplayName("   ")).toBe("無題のカード.mfcard");
  });
});
