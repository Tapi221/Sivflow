import { describe, expect, it } from "vitest";

import { formatCardSetFileDisplayName } from "@/features/deckFile/domain/cardSetFileDisplayName";

describe("formatCardSetFileDisplayName", () => {
  it("末尾の セット を .mfdeck 表示へ置き換える", () => {
    expect(formatCardSetFileDisplayName("データベース方式 セット")).toBe(
      "データベース方式.mfdeck",
    );
  });

  it("すでに .mfdeck が付いている名前は二重付与しない", () => {
    expect(formatCardSetFileDisplayName("データベース方式.mfdeck")).toBe(
      "データベース方式.mfdeck",
    );
  });

  it("空名は無題.mfdeckとして表示する", () => {
    expect(formatCardSetFileDisplayName("  ")).toBe("無題.mfdeck");
  });
});
