import { describe, expect, it } from "vitest";

import { resolveSideBlocks } from "@/components/card/frame/flashcardBlocks";

describe("resolveSideBlocks", () => {
  it("builds legacy fallback blocks without image block", () => {
    const result = resolveSideBlocks("question", {
      blocks: [],
      text: "legacy question",
      code: { code: "console.log('hello')", language: "javascript" },
      audios: [{ url: "https://example.com/audio.mp3" }],
    });

    expect(result.map((block) => block.type)).toEqual(["text", "code", "audio"]);
    expect(result.map((block) => block.orderIndex)).toEqual([0, 1, 2]);
  });

  it("prefers existing blocks when provided", () => {
    const existing = [
      {
        id: "question-image-1",
        type: "image",
        orderIndex: 0,
        images: [{ url: "https://example.com/image.png" }],
      },
    ] as Parameters<typeof resolveSideBlocks>[1]["blocks"];

    const result = resolveSideBlocks("question", {
      blocks: existing,
      text: "ignored",
      code: { code: "ignored", language: "text" },
      audios: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("image");
    expect(result[0]?.id).toBe("question-image-1");
  });
});


