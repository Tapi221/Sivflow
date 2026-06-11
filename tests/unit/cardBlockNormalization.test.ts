import { describe, expect, it } from "vitest";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";

describe("normalizeCard block typing", () => {
  it("古い legacy block arrays より canonical face blocks を優先する", () => {
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

  it("canonical face blocks が明示的に空なら legacy content を復活させない", () => {
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

  it("未知の block type は code ではなく text にフォールバックする", () => {
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
