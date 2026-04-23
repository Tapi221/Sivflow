import { describe, expect, it } from "vitest";
import {
  buildPdfTextSelection,
  scorePdfTextQuality,
} from "@/lib/pdf/pdfTextExtraction";

describe("pdfTextExtraction", () => {
  it("scores readable native text higher than noisy fragments", () => {
    const readable = "微分係数の定義\n極限を用いて関数の変化率を求める。";
    const noisy = "| | | | --- ___ □□□";

    expect(scorePdfTextQuality(readable)).toBeGreaterThan(
      scorePdfTextQuality(noisy),
    );
  });

  it("prefers OCR text when native text is low quality", () => {
    const selection = buildPdfTextSelection({
      nativeText: "| | | | --- ___",
      ocrText: "微分係数の定義\n極限を用いて関数の変化率を求める。",
    });

    expect(selection.source).toBe("ocr");
    expect(selection.finalText).toContain("微分係数の定義");
  });

  it("builds a hybrid result when both sources contribute unique lines", () => {
    const selection = buildPdfTextSelection({
      nativeText: "Chapter 1\n微分係数の定義",
      ocrText: "微分係数の定義\n例題 1",
    });

    expect(selection.source).toBe("hybrid");
    expect(selection.finalText).toContain("Chapter 1");
    expect(selection.finalText).toContain("例題 1");
  });
});
