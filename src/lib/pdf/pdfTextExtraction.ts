export type PdfOcrTextSource = "native" | "ocr" | "hybrid";
export type PdfOcrRecordStatus = "success" | "partial" | "error";

export interface PdfOcrLineRecord {
  order: number;
  text: string;
  origin: PdfOcrTextSource;
}

export interface PdfTextSelection {
  finalText: string;
  source: PdfOcrTextSource;
  status: PdfOcrRecordStatus;
  qualityScore: number;
  nativeQualityScore: number;
  ocrQualityScore: number;
  charCount: number;
  lineCount: number;
  lines: PdfOcrLineRecord[];
}

const PDF_TEXT_SYMBOL_RUN_RE = /[_=\-]{4,}|[|/\\]{4,}|\.{4,}/g;
const PDF_TEXT_MOJIBAKE_RE = /[�□◻︎◼︎◆◇]/g;
const PDF_TEXT_MULTISPACE_RE = /\s{3,}/g;
const PDF_TEXT_PRINTABLE_RE = /[\p{L}\p{N}\p{P}\p{S}\p{Zs}]/gu;
const PDF_TEXT_WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}\p{M}_-]*/gu;

const clampUnit = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
};

export const normalizePdfExtractedText = (value: string) => {
  return value.replace(/\r\n?/g, "\n").replace(/\t/g, " ").trim();
};

export const splitPdfTextIntoLines = (value: string) => {
  return normalizePdfExtractedText(value)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
};

const getTokenCount = (text: string) => {
  return text.match(PDF_TEXT_WORD_RE)?.length ?? 0;
};

const getPrintableRatio = (text: string) => {
  if (text.length === 0) {
    return 0;
  }

  return (text.match(PDF_TEXT_PRINTABLE_RE)?.length ?? 0) / text.length;
};

const getSingleCharacterLineRatio = (lines: string[]) => {
  if (lines.length === 0) {
    return 1;
  }

  const singleCharacterLineCount = lines.filter((line) => line.length <= 1).length;
  return singleCharacterLineCount / lines.length;
};

const getSuspiciousLineRatio = (lines: string[]) => {
  if (lines.length === 0) {
    return 1;
  }

  const suspiciousLineCount = lines.filter((line) => {
    const compactLine = line.replace(/\s+/g, "");
    if (compactLine.length === 0) {
      return true;
    }

    const wordCount = getTokenCount(line);
    const symbolRunCount = compactLine.match(PDF_TEXT_SYMBOL_RUN_RE)?.length ?? 0;
    return wordCount === 0 || symbolRunCount > 0;
  }).length;

  return suspiciousLineCount / lines.length;
};

export const scorePdfTextQuality = (rawValue: string) => {
  const text = normalizePdfExtractedText(rawValue);
  const lines = splitPdfTextIntoLines(text);
  const charCount = text.length;
  const tokenCount = getTokenCount(text);

  if (charCount === 0) {
    return 0;
  }

  const printableRatio = getPrintableRatio(text);
  const singleCharacterLineRatio = getSingleCharacterLineRatio(lines);
  const suspiciousLineRatio = getSuspiciousLineRatio(lines);
  const mojibakeRatio = (text.match(PDF_TEXT_MOJIBAKE_RE)?.length ?? 0) / Math.max(charCount, 1);
  const symbolRunRatio = (text.match(PDF_TEXT_SYMBOL_RUN_RE)?.length ?? 0) / Math.max(lines.length, 1);
  const multiSpaceRatio = (text.match(PDF_TEXT_MULTISPACE_RE)?.length ?? 0) / Math.max(lines.length, 1);

  let score = 0;
  score += clampUnit(charCount / 120) * 0.2;
  score += clampUnit(tokenCount / 20) * 0.2;
  score += clampUnit(printableRatio) * 0.2;
  score += clampUnit(1 - singleCharacterLineRatio) * 0.15;
  score += clampUnit(1 - suspiciousLineRatio) * 0.15;
  score += clampUnit(1 - mojibakeRatio * 6) * 0.05;
  score += clampUnit(1 - symbolRunRatio * 1.5) * 0.03;
  score += clampUnit(1 - multiSpaceRatio * 1.5) * 0.02;

  return Number(clampUnit(score).toFixed(4));
};

const normalizeLineKey = (line: string) => {
  return line.replace(/\s+/g, " ").trim().toLowerCase();
};

const buildOriginLines = (
  value: string,
  origin: Exclude<PdfOcrTextSource, "hybrid">,
) => {
  return splitPdfTextIntoLines(value).map((text, index) => ({
    order: index,
    text,
    origin,
  } satisfies PdfOcrLineRecord));
};

const mergeLineCandidates = ({
  primaryLines,
  secondaryLines,
}: {
  primaryLines: PdfOcrLineRecord[];
  secondaryLines: PdfOcrLineRecord[];
}) => {
  const seen = new Set<string>();
  const mergedLines: PdfOcrLineRecord[] = [];

  [...primaryLines, ...secondaryLines].forEach((line) => {
    const key = normalizeLineKey(line.text);
    if (key.length === 0 || seen.has(key)) {
      return;
    }

    seen.add(key);
    mergedLines.push({
      order: mergedLines.length,
      text: line.text,
      origin: line.origin,
    });
  });

  return mergedLines;
};

const toSelectionStatus = ({
  finalText,
  qualityScore,
}: {
  finalText: string;
  qualityScore: number;
}): PdfOcrRecordStatus => {
  if (finalText.length === 0) {
    return "error";
  }

  if (qualityScore >= 0.55) {
    return "success";
  }

  return "partial";
};

const buildSelectionResult = ({
  finalText,
  source,
  nativeQualityScore,
  ocrQualityScore,
  lines,
}: {
  finalText: string;
  source: PdfOcrTextSource;
  nativeQualityScore: number;
  ocrQualityScore: number;
  lines: PdfOcrLineRecord[];
}) => {
  const normalizedFinalText = normalizePdfExtractedText(finalText);
  const effectiveLines =
    lines.length > 0
      ? lines.map((line, index) => ({ ...line, order: index }))
      : buildOriginLines(normalizedFinalText, source === "hybrid" ? "native" : source);
  const qualityScore = Math.max(nativeQualityScore, ocrQualityScore);

  return {
    finalText: normalizedFinalText,
    source,
    status: toSelectionStatus({
      finalText: normalizedFinalText,
      qualityScore,
    }),
    qualityScore: Number(qualityScore.toFixed(4)),
    nativeQualityScore: Number(nativeQualityScore.toFixed(4)),
    ocrQualityScore: Number(ocrQualityScore.toFixed(4)),
    charCount: normalizedFinalText.length,
    lineCount: effectiveLines.length,
    lines: effectiveLines,
  } satisfies PdfTextSelection;
};

export const buildPdfTextSelection = ({
  nativeText,
  ocrText,
}: {
  nativeText: string;
  ocrText: string;
}) => {
  const normalizedNativeText = normalizePdfExtractedText(nativeText);
  const normalizedOcrText = normalizePdfExtractedText(ocrText);
  const nativeQualityScore = scorePdfTextQuality(normalizedNativeText);
  const ocrQualityScore = scorePdfTextQuality(normalizedOcrText);
  const nativeLines = buildOriginLines(normalizedNativeText, "native");
  const ocrLines = buildOriginLines(normalizedOcrText, "ocr");

  if (normalizedNativeText.length === 0 && normalizedOcrText.length === 0) {
    return buildSelectionResult({
      finalText: "",
      source: "native",
      nativeQualityScore,
      ocrQualityScore,
      lines: [],
    });
  }

  if (normalizedNativeText.length > 0 && normalizedOcrText.length === 0) {
    return buildSelectionResult({
      finalText: normalizedNativeText,
      source: "native",
      nativeQualityScore,
      ocrQualityScore,
      lines: nativeLines,
    });
  }

  if (normalizedNativeText.length === 0 && normalizedOcrText.length > 0) {
    return buildSelectionResult({
      finalText: normalizedOcrText,
      source: "ocr",
      nativeQualityScore,
      ocrQualityScore,
      lines: ocrLines,
    });
  }

  const scoreDelta = ocrQualityScore - nativeQualityScore;
  if (scoreDelta >= 0.18) {
    return buildSelectionResult({
      finalText: normalizedOcrText,
      source: "ocr",
      nativeQualityScore,
      ocrQualityScore,
      lines: ocrLines,
    });
  }

  if (scoreDelta <= -0.18 && nativeQualityScore >= 0.45) {
    return buildSelectionResult({
      finalText: normalizedNativeText,
      source: "native",
      nativeQualityScore,
      ocrQualityScore,
      lines: nativeLines,
    });
  }

  const primarySource = ocrQualityScore >= nativeQualityScore ? "ocr" : "native";
  const mergedLines = mergeLineCandidates({
    primaryLines: primarySource === "ocr" ? ocrLines : nativeLines,
    secondaryLines: primarySource === "ocr" ? nativeLines : ocrLines,
  });
  const mergedText = mergedLines.map((line) => line.text).join("\n");
  const mergedQualityScore = scorePdfTextQuality(mergedText);

  if (
    mergedLines.length > Math.max(nativeLines.length, ocrLines.length) &&
    mergedQualityScore >= Math.max(nativeQualityScore, ocrQualityScore) - 0.05
  ) {
    return buildSelectionResult({
      finalText: mergedText,
      source: "hybrid",
      nativeQualityScore,
      ocrQualityScore,
      lines: mergedLines,
    });
  }

  if (ocrQualityScore >= nativeQualityScore) {
    return buildSelectionResult({
      finalText: normalizedOcrText,
      source: "ocr",
      nativeQualityScore,
      ocrQualityScore,
      lines: ocrLines,
    });
  }

  return buildSelectionResult({
    finalText: normalizedNativeText,
    source: "native",
    nativeQualityScore,
    ocrQualityScore,
    lines: nativeLines,
  });
};
