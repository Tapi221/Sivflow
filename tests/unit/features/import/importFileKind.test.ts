import { describe, expect, it } from "vitest";

import {
  detectImportFileKind,
  isSupportedImportFileKind,
} from "@/features/import/domain/importFileKind";

const makeFileLike = (name: string, type = "") => {
  return { name, type } as File;
};

describe("importFileKind", () => {
  it("拡張子からインポート形式を判定する", () => {
    expect(detectImportFileKind(makeFileLike("sample.mfdeck"))).toBe("mfdeck");
    expect(detectImportFileKind(makeFileLike("sample.mfcard"))).toBe("mfcard");
    expect(detectImportFileKind(makeFileLike("sample.xlsx"))).toBe("xlsx");
  });

  it("MIME type からインポート形式を判定する", () => {
    expect(
      detectImportFileKind(
        makeFileLike("backup", "application/vnd.manifolia.deck+zip"),
      ),
    ).toBe("mfdeck");
    expect(
      detectImportFileKind(
        makeFileLike("card", "application/vnd.manifolia.card+json"),
      ),
    ).toBe("mfcard");
    expect(
      detectImportFileKind(
        makeFileLike(
          "bulk",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
      ),
    ).toBe("xlsx");
  });

  it("未知のファイル形式を拒否できる", () => {
    const kind = detectImportFileKind(makeFileLike("memo.txt", "text/plain"));

    expect(kind).toBe("unknown");
    expect(isSupportedImportFileKind(kind)).toBe(false);
    expect(isSupportedImportFileKind("mfdeck")).toBe(true);
  });
});
