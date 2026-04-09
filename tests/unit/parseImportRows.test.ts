import { describe, expect, it } from "vitest";

import { parseImportRows } from "@/features/import/application/parseImportRows";

describe("parseImportRows", () => {
  it("rows から payload を組み立て、side 未指定は front 扱いにする", () => {
    const result = parseImportRows({
      sheetName: "blocks",
      rows: [
        ["cardId", "side", "blockOrder", "type", "content", "title"],
        ["card-001", "", "1", "text", "表面", "カードA"],
        ["card-001", "back", "1", "markdown", "裏面", "カードA"],
      ],
    });

    expect(result.issues).toEqual([]);
    expect(result.payload).toEqual({
      version: 1,
      source: "xlsx",
      cards: [
        {
          cardId: "card-001",
          title: "カードA",
          frontBlocks: [
            { type: "text", order: 1, content: "表面", language: undefined },
          ],
          backBlocks: [
            { type: "markdown", order: 1, content: "裏面", language: undefined },
          ],
        },
      ],
    });
  });

  it("必須ヘッダー不足なら missing_required_header error を返す", () => {
    const result = parseImportRows({
      sheetName: "blocks",
      rows: [
        ["cardId", "type", "content"],
        ["card-001", "text", "本文"],
      ],
    });

    expect(result.payload).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "missing_required_header",
          columnKey: "blockOrder",
        }),
      ]),
    );
  });

  it("warning は維持しつつ error があれば payload を返さない", () => {
    const result = parseImportRows({
      sheetName: "blocks",
      rows: [
        [
          "cardId",
          "side",
          "blockOrder",
          "type",
          "content",
          "language",
          "image",
          "title",
        ],
        ["card-001", "", "1", "text", "本文", "ts", "", "カードA"],
        ["card-002", "front", "1", "image", "", "", "sample.png", "画像カード"],
      ],
    });

    expect(result.payload).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warning",
          code: "unexpected_value",
          rowNumber: 2,
          columnKey: "language",
        }),
        expect.objectContaining({
          level: "error",
          code: "unsupported_image_cell",
          rowNumber: 3,
          columnKey: "image",
        }),
      ]),
    );
  });
});
