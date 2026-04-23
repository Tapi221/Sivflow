import {
  getPdfTextLanguageProfile,
  guessPreferredOcrLanguages,
  normalizePdfExtractedText,
  scorePdfTextQuality,
  splitPdfTextIntoLines,
} from "@/lib/pdf/pdfTextExtraction";

export type PdfOcrPageKind =
  | "native-rich"
  | "dense-text"
  | "mixed-layout"
  | "sparse-scan"
  | "numeric-heavy"
  | "unknown";

export interface PdfOcrPageClassification {
  kind: PdfOcrPageKind;
  confidence: number;
  preferredLanguages: string[];
  shouldPreferRegions: boolean;
  shouldEnableDeskew: boolean;
  shouldTryRotation: boolean;
  recommendedTargetPixels: number;
  recommendedMinScale: number;
  recommendedMaxScale: number;
  recommendedInitialMode: "none" | "grayscale" | "binary";
  failureBudget: number;
}

const clampUnit = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
};

const round = (value: number) => {
  return Number(clampUnit(value).toFixed(4));
};

const getAverageLineLength = (lines: string[]) => {
  if (lines.length === 0) {
    return 0;
  }

  return (
    lines.reduce((sum, line) => sum + line.length, 0) /
    Math.max(lines.length, 1)
  );
};

const getShortLineRatio = (lines: string[]) => {
  if (lines.length === 0) {
    return 1;
  }

  return lines.filter((line) => line.length <= 8).length / lines.length;
};

const getDuplicateLineRatio = (lines: string[]) => {
  if (lines.length === 0) {
    return 0;
  }

  const normalizedLines = lines.map((line) => line.trim().toLowerCase());
  return (
    1 - new Set(normalizedLines).size / Math.max(normalizedLines.length, 1)
  );
};

const getLongestLineLength = (lines: string[]) => {
  return lines.reduce((maxLength, line) => Math.max(maxLength, line.length), 0);
};

export const classifyPdfOcrPage = ({
  nativeText,
}: {
  nativeText: string;
}): PdfOcrPageClassification => {
  const normalizedNativeText = normalizePdfExtractedText(nativeText);
  const lines = splitPdfTextIntoLines(normalizedNativeText);
  const qualityScore = scorePdfTextQuality(normalizedNativeText);
  const languageProfile = getPdfTextLanguageProfile(normalizedNativeText);
  const preferredLanguages = guessPreferredOcrLanguages(normalizedNativeText);

  const charCount = normalizedNativeText.length;
  const lineCount = lines.length;
  const averageLineLength = getAverageLineLength(lines);
  const shortLineRatio = getShortLineRatio(lines);
  const duplicateLineRatio = getDuplicateLineRatio(lines);
  const longestLineLength = getLongestLineLength(lines);

  if (charCount >= 120 && qualityScore >= 0.82 && averageLineLength >= 18) {
    return {
      kind: "native-rich",
      confidence: round(0.92),
      preferredLanguages,
      shouldPreferRegions: false,
      shouldEnableDeskew: false,
      shouldTryRotation: false,
      recommendedTargetPixels: 3_000_000,
      recommendedMinScale: 1.3,
      recommendedMaxScale: 2.2,
      recommendedInitialMode: "none",
      failureBudget: 1,
    };
  }

  if (lineCount >= 18 && averageLineLength >= 16 && shortLineRatio <= 0.34) {
    return {
      kind: "dense-text",
      confidence: round(Math.max(0.6, qualityScore)),
      preferredLanguages,
      shouldPreferRegions: false,
      shouldEnableDeskew: true,
      shouldTryRotation: false,
      recommendedTargetPixels: 4_800_000,
      recommendedMinScale: 1.8,
      recommendedMaxScale: 3,
      recommendedInitialMode: qualityScore >= 0.26 ? "grayscale" : "binary",
      failureBudget: 2,
    };
  }

  if (
    languageProfile.digitRatio >= 0.22 &&
    languageProfile.latinRatio >= 0.08 &&
    averageLineLength <= 20
  ) {
    return {
      kind: "numeric-heavy",
      confidence: round(Math.max(0.55, languageProfile.digitRatio + 0.3)),
      preferredLanguages,
      shouldPreferRegions: true,
      shouldEnableDeskew: qualityScore < 0.5,
      shouldTryRotation: false,
      recommendedTargetPixels: 5_200_000,
      recommendedMinScale: 1.9,
      recommendedMaxScale: 3.1,
      recommendedInitialMode: "binary",
      failureBudget: 2,
    };
  }

  if (
    charCount <= 32 ||
    (qualityScore < 0.18 && lineCount <= 6) ||
    (shortLineRatio >= 0.72 && longestLineLength <= 20)
  ) {
    return {
      kind: "sparse-scan",
      confidence: round(Math.max(0.54, 1 - qualityScore)),
      preferredLanguages,
      shouldPreferRegions: true,
      shouldEnableDeskew: true,
      shouldTryRotation: true,
      recommendedTargetPixels: 6_200_000,
      recommendedMinScale: 2,
      recommendedMaxScale: 3.4,
      recommendedInitialMode: "binary",
      failureBudget: 3,
    };
  }

  if (duplicateLineRatio >= 0.22 || shortLineRatio >= 0.52) {
    return {
      kind: "mixed-layout",
      confidence: round(Math.max(0.5, shortLineRatio)),
      preferredLanguages,
      shouldPreferRegions: true,
      shouldEnableDeskew: true,
      shouldTryRotation: qualityScore < 0.12,
      recommendedTargetPixels: 5_700_000,
      recommendedMinScale: 1.9,
      recommendedMaxScale: 3.2,
      recommendedInitialMode: "binary",
      failureBudget: 3,
    };
  }

  return {
    kind: "unknown",
    confidence: round(0.45),
    preferredLanguages,
    shouldPreferRegions: qualityScore < 0.42,
    shouldEnableDeskew: qualityScore < 0.58,
    shouldTryRotation: qualityScore < 0.1 && charCount < 24,
    recommendedTargetPixels: 4_600_000,
    recommendedMinScale: 1.7,
    recommendedMaxScale: 3,
    recommendedInitialMode: qualityScore >= 0.22 ? "grayscale" : "binary",
    failureBudget: 2,
  };
};
