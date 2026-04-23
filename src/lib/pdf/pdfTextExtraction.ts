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

export interface PdfTextLanguageProfile {
  japaneseRatio: number;
  latinRatio: number;
  digitRatio: number;
  dominant: "japanese" | "latin" | "mixed";
}

const PDF_TEXT_SYMBOL_RUN_RE = /[_=\-]{4,}|[|/\\]{4,}|\.{4,}/g;
const PDF_TEXT_MOJIBAKE_RE = /[�□◻︎◼︎◆◇]/g;
const PDF_TEXT_MULTISPACE_RE = /\s{3,}/g;
const PDF_TEXT_PRINTABLE_RE = /[\p{L}\p{N}\p{P}\p{S}\p{Zs}]/gu;
const PDF_TEXT_WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}\p{M}_-]*/gu;
const PDF_TEXT_JAPANESE_RE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu;
const PDF_TEXT_LATIN_RE = /[A-Za-z]/g;
const PDF_TEXT_DIGIT_RE = /\d/g;

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

const getDuplicateLineRatio = (lines: string[]) => {
  if (lines.length === 0) {
    return 0;
  }

  const uniqueCount = new Set(lines.map((line) => line.toLowerCase())).size;
  return 1 - uniqueCount / Math.max(lines.length, 1);
};

const getShortLineRatio = (lines: string[]) => {
  if (lines.length === 0) {
    return 1;
  }

  return lines.filter((line) => line.length <= 6).length / lines.length;
};

const getAverageLineLength = (lines: string[]) => {
  if (lines.length === 0) {
    return 0;
  }

  const totalLength = lines.reduce((sum, line) => sum + line.length, 0);
  return totalLength / lines.length;
};

export const scorePdfLineQuality = (rawValue: string) => {
  const line = normalizePdfExtractedText(rawValue);
  if (line.length === 0) {
    return 0;
  }

  const printableRatio = getPrintableRatio(line);
  const tokenCount = getTokenCount(line);
  const mojibakeRatio =
    (line.match(PDF_TEXT_MOJIBAKE_RE)?.length ?? 0) / Math.max(line.length, 1);
  const symbolRunRatio =
    (line.match(PDF_TEXT_SYMBOL_RUN_RE)?.length ?? 0) / Math.max(line.length, 1);

  let score = 0;
  score += clampUnit(line.length / 48) * 0.28;
  score += clampUnit(tokenCount / 7) * 0.22;
  score += clampUnit(printableRatio) * 0.22;
  score += clampUnit(1 - mojibakeRatio * 8) * 0.18;
  score += clampUnit(1 - symbolRunRatio * 10) * 0.1;

  return Number(clampUnit(score).toFixed(4));
};

export const hasMeaningfulPdfText = (rawValue: string) => {
  const normalized = normalizePdfExtractedText(rawValue);
  if (normalized.length === 0) {
    return false;
  }

  return scorePdfTextQuality(normalized) >= 0.18 || normalized.length >= 10;
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
  const duplicateLineRatio = getDuplicateLineRatio(lines);
  const shortLineRatio = getShortLineRatio(lines);
  const averageLineLength = getAverageLineLength(lines);
  const mojibakeRatio =
    (text.match(PDF_TEXT_MOJIBAKE_RE)?.length ?? 0) / Math.max(charCount, 1);
  const symbolRunRatio =
    (text.match(PDF_TEXT_SYMBOL_RUN_RE)?.length ?? 0) / Math.max(lines.length, 1);
  const multiSpaceRatio =
    (text.match(PDF_TEXT_MULTISPACE_RE)?.length ?? 0) / Math.max(lines.length, 1);

  let score = 0;
  score += clampUnit(charCount / 140) * 0.14;
  score += clampUnit(tokenCount / 24) * 0.16;
  score += clampUnit(printableRatio) * 0.14;
  score += clampUnit(1 - singleCharacterLineRatio) * 0.1;
  score += clampUnit(1 - suspiciousLineRatio) * 0.12;
  score += clampUnit(1 - duplicateLineRatio) * 0.08;
  score += clampUnit(1 - shortLineRatio) * 0.08;
  score += clampUnit(averageLineLength / 28) * 0.08;
  score += clampUnit(1 - mojibakeRatio * 6) * 0.06;
  score += clampUnit(1 - symbolRunRatio * 1.5) * 0.02;
  score += clampUnit(1 - multiSpaceRatio * 1.5) * 0.02;

  return Number(clampUnit(score).toFixed(4));
};

export const getPdfTextLanguageProfile = (
  rawValue: string,
): PdfTextLanguageProfile => {
  const text = normalizePdfExtractedText(rawValue);
  if (text.length === 0) {
    return {
      japaneseRatio: 0,
      latinRatio: 0,
      digitRatio: 0,
      dominant: "mixed",
    };
  }

  const japaneseCount = text.match(PDF_TEXT_JAPANESE_RE)?.length ?? 0;
  const latinCount = text.match(PDF_TEXT_LATIN_RE)?.length ?? 0;
  const digitCount = text.match(PDF_TEXT_DIGIT_RE)?.length ?? 0;
  const japaneseRatio = japaneseCount / Math.max(text.length, 1);
  const latinRatio = latinCount / Math.max(text.length, 1);
  const digitRatio = digitCount / Math.max(text.length, 1);

  if (japaneseRatio >= 0.16 && latinRatio < 0.1) {
    return {
      japaneseRatio: Number(japaneseRatio.toFixed(4)),
      latinRatio: Number(latinRatio.toFixed(4)),
      digitRatio: Number(digitRatio.toFixed(4)),
      dominant: "japanese",
    };
  }

  if (latinRatio >= 0.22 && japaneseRatio < 0.08) {
    return {
      japaneseRatio: Number(japaneseRatio.toFixed(4)),
      latinRatio: Number(latinRatio.toFixed(4)),
      digitRatio: Number(digitRatio.toFixed(4)),
      dominant: "latin",
    };
  }

  return {
    japaneseRatio: Number(japaneseRatio.toFixed(4)),
    latinRatio: Number(latinRatio.toFixed(4)),
    digitRatio: Number(digitRatio.toFixed(4)),
    dominant: "mixed",
  };
};

export const guessPreferredOcrLanguages = (rawValue: string) => {
  const profile = getPdfTextLanguageProfile(rawValue);

  if (profile.dominant === "japanese") {
    return ["jpn", "jpn+eng", "eng"];
  }

  if (profile.dominant === "latin") {
    return ["eng", "jpn+eng", "jpn"];
  }

  if (profile.digitRatio >= 0.2 && profile.latinRatio >= 0.1) {
    return ["eng", "jpn+eng", "jpn"];
  }

  return ["jpn+eng", "jpn", "eng"];
};

const normalizeLineKey = (line: string) => {
  return line.replace(/\s+/g, " ").trim().toLowerCase();
};

const buildOriginLines = (
  value: string,
  origin: Exclude<PdfOcrTextSource, "hybrid">,
) => {
  return splitPdfTextIntoLines(value).map(
    (text, index) =>
      ({
        order: index,
        text,
        origin,
      }) satisfies PdfOcrLineRecord,
  );
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
      : buildOriginLines(
          normalizedFinalText,
          source === "hybrid" ? "native" : source,
        );
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
  if (scoreDelta >= 0.16) {
    return buildSelectionResult({
      finalText: normalizedOcrText,
      source: "ocr",
      nativeQualityScore,
      ocrQualityScore,
      lines: ocrLines,
    });
  }

  if (scoreDelta <= -0.16 && nativeQualityScore >= 0.46) {
    return buildSelectionResult({
      finalText: normalizedNativeText,
      source: "native",
      nativeQualityScore,
      ocrQualityScore,
      lines: nativeLines,
    });
  }

  const primarySource =
    ocrQualityScore >= nativeQualityScore ? "ocr" : "native";
  const mergedLines = mergeLineCandidates({
    primaryLines: primarySource === "ocr" ? ocrLines : nativeLines,
    secondaryLines: primarySource === "ocr" ? nativeLines : ocrLines,
  });
  const mergedText = mergedLines.map((line) => line.text).join("\n");
  const mergedQualityScore = scorePdfTextQuality(mergedText);

  if (
    mergedLines.length > Math.max(nativeLines.length, ocrLines.length) &&
    mergedQualityScore >= Math.max(nativeQualityScore, ocrQualityScore) - 0.04
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

export const selectBestPdfTextSelection = (
  selections: readonly PdfTextSelection[],
) => {
  if (selections.length === 0) {
    return buildPdfTextSelection({ nativeText: "", ocrText: "" });
  }

  return [...selections].sort((left, right) => {
    if (right.qualityScore !== left.qualityScore) {
      return right.qualityScore - left.qualityScore;
    }

    if (right.charCount !== left.charCount) {
      return right.charCount - left.charCount;
    }

    return right.lineCount - left.lineCount;
  })[0];
};

export const mergePdfTextSelections = (
  selections: readonly PdfTextSelection[],
  preferredSource: PdfOcrTextSource = "ocr",
) => {
  const meaningfulSelections = selections.filter(
    (selection) => selection.finalText.length > 0,
  );

  if (meaningfulSelections.length === 0) {
    return buildPdfTextSelection({ nativeText: "", ocrText: "" });
  }

  const orderedSelections = [...meaningfulSelections].sort((left, right) => {
    const leftPreferred = left.source === preferredSource ? 1 : 0;
    const rightPreferred = right.source === preferredSource ? 1 : 0;
    if (leftPreferred !== rightPreferred) {
      return rightPreferred - leftPreferred;
    }

    if (right.qualityScore !== left.qualityScore) {
      return right.qualityScore - left.qualityScore;
    }

    return right.charCount - left.charCount;
  });

  const mergedLines = mergeLineCandidates({
    primaryLines: orderedSelections.flatMap((selection) => selection.lines),
    secondaryLines: [],
  });

  return buildSelectionResult({
    finalText: mergedLines.map((line) => line.text).join("\n"),
    source: "hybrid",
    nativeQualityScore: Math.max(
      ...orderedSelections.map((selection) => selection.nativeQualityScore),
    ),
    ocrQualityScore: Math.max(
      ...orderedSelections.map((selection) => selection.ocrQualityScore),
    ),
    lines: mergedLines.map((line, index) => ({
      ...line,
      order: index,
    })),
  });
};
