import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseXlsxImport } from "@/features/import/xlsx/parseXlsxImport";
import type { ImportIssue } from "@/features/import/types";

/**
 * テスト用の XLSX ファイル (ArrayBuffer) を生成するユーティリティ
 */
const createWorkbookBuffer = (sheets: Record<string, unknown[][]>) => {
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, rows]) => {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
};

describe("parseXlsxImport", () => {
  it("blocks シートの有効な行を cardId ごとにまとめて payload を返す", async () => {
    const fileBuffer = createWorkbookBuffer({
      blocks: [
        ["cardId", "blockOrder", "type", "content", "language", "title"],
        ["card-001", "1", "text", "最初のテキスト", "", "カードA"],
        [
          "card-001",
          "2",
          "code",
          "const sum = (a: number, b: number) => a + b;",
          "typescript",
          "カードA",
        ],
        ["card-002", "1", "markdown", "# 見出し", "", "カードB"],
      ],
    });

    const result = await parseXlsxImport(fileBuffer);

    expect(result.issues).toEqual([]);
    expect(result.payload).toEqual({
      version: 1,
      source: "xlsx",
      cards: [
        {
          cardId: "card-001",
          title: "カードA",
          blocks: [
            {
              type: "text",
              order: 1,
              content: "最初のテキスト",
              language: undefined,
            },
            {
              type: "code",
              order: 2,
              content: "const sum = (a: number, b: number) => a + b;",
              language: "typescript",
            },
          ],
        },
        {
          cardId: "card-002",
          title: "カードB",
          blocks: [
            {
              type: "markdown",
              order: 1,
              content: "# 見出し",
              language: undefined,
            },
          ],
        },
      ],
    });
  });

  it("blocks シートが無いと missing_sheet error を返す", async () => {
    const fileBuffer = createWorkbookBuffer({
      readme: [["header"], ["value"]],
    });

    const result = await parseXlsxImport(fileBuffer);

    expect(result.payload).toBeNull();
    expect(result.issues).toEqual([
      expect.objectContaining({
        level: "error",
        code: "missing_sheet",
        sheetName: "blocks",
      }),
    ]);
  });

  it("必須ヘッダー不足なら payload を作らず missing_required_header error を返す", async () => {
    const fileBuffer = createWorkbookBuffer({
      blocks: [
        ["cardId", "type", "content"],
        ["card-001", "text", "本文"],
      ],
    });

    const result = await parseXlsxImport(fileBuffer);

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

  it("type=image は unsupported_image_cell error として止める", async () => {
    const fileBuffer = createWorkbookBuffer({
      blocks: [
        ["cardId", "blockOrder", "type", "content", "image", "title"],
        ["card-001", "1", "image", "", "sample.png", "画像カード"],
      ],
    });

    const result = await parseXlsxImport(fileBuffer);

    expect(result.payload).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "unsupported_image_cell",
          rowNumber: 2,
          columnKey: "image",
        }),
      ]),
    );
  });

  it("同じ cardId 内で blockOrder が重複すると duplicate_block_order error を返す", async () => {
    const fileBuffer = createWorkbookBuffer({
      blocks: [
        ["cardId", "blockOrder", "type", "content", "title"],
        ["card-001", "1", "text", "1つ目", "カードA"],
        ["card-001", "1", "markdown", "2つ目", "カードA"],
      ],
    });

    const result = await parseXlsxImport(fileBuffer);

    expect(result.payload).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "duplicate_block_order",
          rowNumber: 3,
          columnKey: "blockOrder",
        }),
      ]),
    );
  });

  it("warning だけなら payload を返しつつ issues に warning を残す", async () => {
    const fileBuffer = createWorkbookBuffer({
      blocks: [
        ["cardId", "blockOrder", "type", "content", "language", "title"],
        ["card-001", "1", "text", "本文", "typescript", "カードA"],
        ["card-001", "2", "markdown", "## md", "", "カードA 別名"],
      ],
    });

    const result = await parseXlsxImport(fileBuffer);

    expect(result.payload).not.toBeNull();
    expect(result.payload?.cards).toHaveLength(1);
    expect(result.payload?.cards[0]).toEqual(
      expect.objectContaining({
        cardId: "card-001",
        title: "カードA",
      }),
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warning",
          code: "unexpected_value",
          rowNumber: 2,
          columnKey: "language",
        }),
        expect.objectContaining({
          level: "warning",
          code: "mixed_title_in_same_card",
          rowNumber: 3,
          columnKey: "title",
        }),
      ]),
    );
    expect(
      result.issues.some((issue: ImportIssue) => issue.level === "error"),
    ).toBe(false);
  });
});
