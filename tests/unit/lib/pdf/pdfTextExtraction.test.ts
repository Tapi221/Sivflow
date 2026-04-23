import { describe, expect, it } from "vitest";
import {
  buildPdfTextSelection,
  guessPreferredOcrLanguages,
  scorePdfTextQuality,
} from "@/lib/pdf/pdfTextExtraction";

describe("pdfTextExtraction", () => {
  it("prefers OCR when native text quality is much lower", () => {
    const selection = buildPdfTextSelection({
      nativeText: "a\nb\nc\nd\ne",
      ocrText: "光合成は葉緑体で行われる。二酸化炭素と水から有機物を合成する。",
    });

    expect(selection.source).toBe("ocr");
    expect(selection.qualityScore).toBeGreaterThan(0.6);
  });

  it("guesses japanese-first OCR for Japanese heavy text", () => {
    expect(
      guessPreferredOcrLanguages(
        "免疫記憶は再感染時の応答を速める。抗体価の推移を確認する。",
      )[0],
    ).toBe("jpn");
  });

  it("scores readable paragraph text above noisy symbols", () => {
    const paragraphScore = scorePdfTextQuality(
      "Cell division produces two daughter cells with nearly identical genetic information.",
    );
    const noisyScore = scorePdfTextQuality("==== //// .... □□□□");

    expect(paragraphScore).toBeGreaterThan(noisyScore);
  });
});
