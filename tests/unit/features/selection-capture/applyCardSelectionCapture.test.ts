import { describe, expect, it } from "vitest";
import { appendSelectionCaptureBlocks, normalizeSelectionCaptureOcrText, type CapturedCardImage } from "@/features/selection-capture/applyCardSelectionCapture";
import type { CardBlock } from "@/types";

const capturedImage: CapturedCardImage = {
  id: "asset-1",
  assetId: "asset-1",
  localFileId: "blob-1",
  remoteUrl: null,
  localUrl: null,
  status: "uploading",
  storagePath: "users/user-1/assets/asset-1",
  contentType: "image/png",
  size: 128,
  sizeBytes: 128,
  source: "local_fallback",
  naturalW: 320,
  naturalH: 160,
  scale: 1,
  x: 0,
  layout: null,
};

const existingBlock: CardBlock = {
  id: "question-text-1",
  type: "text",
  content: "existing",
  orderIndex: 0,
};

describe("applyCardSelectionCapture", () => {
  it("normalizes OCR text", () => {
    expect(normalizeSelectionCaptureOcrText("  line1\r\nline2\n\n\nline3  ")).toBe("line1\nline2\n\nline3");
    expect(normalizeSelectionCaptureOcrText("   ")).toBeNull();
    expect(normalizeSelectionCaptureOcrText(null)).toBeNull();
  });

  it("appends image and OCR text blocks with reindexed order", () => {
    const result = appendSelectionCaptureBlocks({
      blocks: [existingBlock],
      side: "question",
      image: capturedImage,
      ocrText: " captured text ",
    });

    expect(result.map((block) => block.orderIndex)).toEqual([0, 1, 2]);
    expect(result.map((block) => block.type)).toEqual(["text", "image", "text"]);
    expect(result[1]?.images).toEqual([capturedImage]);
    expect(result[2]?.content).toBe("captured text");
    expect(result[1]?.id).toMatch(/^question-image-capture-/);
    expect(result[2]?.id).toMatch(/^question-text-capture-/);
  });

  it("appends only an image block when OCR text is empty", () => {
    const result = appendSelectionCaptureBlocks({
      blocks: [existingBlock],
      side: "answer",
      image: capturedImage,
      ocrText: " ",
    });

    expect(result.map((block) => block.orderIndex)).toEqual([0, 1]);
    expect(result.map((block) => block.type)).toEqual(["text", "image"]);
    expect(result[1]?.id).toMatch(/^answer-image-capture-/);
  });
});
