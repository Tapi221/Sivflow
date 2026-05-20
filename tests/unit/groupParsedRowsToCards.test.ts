import { describe, expect, it } from "vitest";

import { groupParsedRowsToCards } from "@/features/import/application/groupParsedRowsToCards";
import type { ParsedImportRow } from "@/features/import/domain/importTypes";

describe("groupParsedRowsToCards", () => {
  it("同じ cardId を面ごとにまとめて blockOrder 順に並べる", () => {
    const rows: ParsedImportRow[] = [
      {
        sheetName: "blocks",
        rowNumber: 3,
        cardId: "card-001",
        side: "front",
        title: "カードA",
        block: { type: "markdown", order: 2, content: "後ろ" },
      },
      {
        sheetName: "blocks",
        rowNumber: 2,
        cardId: "card-001",
        side: "front",
        title: "カードA",
        block: { type: "text", order: 1, content: "先頭" },
      },
      {
        sheetName: "blocks",
        rowNumber: 4,
        cardId: "card-001",
        side: "back",
        title: "カードA",
        block: {
          type: "code",
          order: 1,
          content: "const x = 1;",
          language: "ts",
        },
      },
    ];

    const result = groupParsedRowsToCards(rows);

    expect(result.issues).toEqual([]);
    expect(result.cards).toEqual([
      {
        cardId: "card-001",
        title: "カードA",
        frontBlocks: [
          { type: "text", order: 1, content: "先頭" },
          { type: "markdown", order: 2, content: "後ろ" },
        ],
        backBlocks: [
          { type: "code", order: 1, content: "const x = 1;", language: "ts" },
        ],
      },
    ]);
  });

  it("title の不一致は warning にしつつ先着 title を採用し、同一面の blockOrder 重複は error にする", () => {
    const rows: ParsedImportRow[] = [
      {
        sheetName: "blocks",
        rowNumber: 2,
        cardId: "card-001",
        side: "front",
        title: "カードA",
        block: { type: "text", order: 1, content: "本文1" },
      },
      {
        sheetName: "blocks",
        rowNumber: 3,
        cardId: "card-001",
        side: "front",
        title: "カードA 別名",
        block: { type: "markdown", order: 1, content: "本文2" },
      },
      {
        sheetName: "blocks",
        rowNumber: 4,
        cardId: "card-001",
        side: "back",
        title: "カードA 別名",
        block: { type: "text", order: 1, content: "裏面" },
      },
    ];

    const result = groupParsedRowsToCards(rows);

    expect(result.cards[0]?.title).toBe("カードA");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warning",
          code: "mixed_title_in_same_card",
          rowNumber: 3,
          columnKey: "title",
        }),
        expect.objectContaining({
          level: "error",
          code: "duplicate_block_order",
          rowNumber: 3,
          columnKey: "blockOrder",
        }),
      ]),
    );
  });
});
