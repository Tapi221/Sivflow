import { describe, expect, it } from "vitest";

import { normalizeCard } from "@/utils";

describe("normalizeCard block typing", () => {
  it("prefers canonical face blocks over stale legacy block arrays", () => {
    const normalized = normalizeCard({
      id: "canonical-over-legacy",
      front: {
        blocks: [
          {
            id: "front-md",
            type: "markdown",
            markdown: "DARKNESS SUITS ME.",
            orderIndex: 0,
          },
        ],
      },
      questionBlocks: [
        {
          id: "legacy-code",
          type: "code",
          orderIndex: 0,
          code: {
            language: "text",
            code: "DARKNESS SUITS ME.",
          },
        },
      ],
    });

    expect(normalized.front.blocks).toHaveLength(1);
    expect(normalized.front.blocks[0]?.type).toBe("markdown");
    expect(normalized.front.blocks[0]?.markdown).toBe("DARKNESS SUITS ME.");
  });

  it("does not resurrect legacy content when canonical face blocks are explicitly empty", () => {
    const normalized = normalizeCard({
      id: "respect-empty-face",
      front: {
        blocks: [],
      },
      questionText: "stale text",
      questionCode: {
        language: "text",
        code: "stale code",
      },
    });

    expect(normalized.front.blocks).toEqual([]);
  });

  it("falls back unknown block types to text instead of code", () => {
    const normalized = normalizeCard({
      id: "unknown-type-fallback",
      front: {
        blocks: [
          {
            id: "mystery-block",
            type: "txt",
            orderIndex: 0,
            code: {
              language: "text",
              code: "DARKNESS SUITS ME.",
            },
          },
        ],
      },
    });

    expect(normalized.front.blocks).toHaveLength(1);
    expect(normalized.front.blocks[0]?.type).toBe("text");
    expect(normalized.front.blocks[0]?.content).toBe("DARKNESS SUITS ME.");
  });
});
