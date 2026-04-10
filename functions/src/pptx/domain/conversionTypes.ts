export type ConversionStatus = "queued" | "processing" | "ready" | "failed";

export type ExternalConversionResult = {
  manifestPath: string;
  slideCount: number | null;
  fallbackPdfPath: string | null;
};

export type ResolvedManifestMetadata = ExternalConversionResult;

export type ManifestSlide = {
  index: number;
  path: string;
  width: number;
  height: number;
  url?: string;
};

export type ManifestPayload = {
  version: number;
  docId: string;
  userId: string;
  sourceStoragePath: string;
  slideCount?: number;
  fallbackPdfPath?: string | null;
  slides?: ManifestSlide[];
  generatedAt?: string;
};

export const normalizeConversionStatus = (
  value: unknown,
): ConversionStatus | null => {
  if (
    value === "queued" ||
    value === "processing" ||
    value === "ready" ||
    value === "failed"
  ) {
    return value;
  }

  return null;
};

export const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
};
