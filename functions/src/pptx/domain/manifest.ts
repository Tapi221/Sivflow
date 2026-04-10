import { asNonEmptyString, isScopedStoragePath } from "../security/guards";
import {
  asFiniteNumber,
  ManifestPayload,
  ResolvedManifestMetadata,
} from "./conversionTypes";
import { createPptxConversionError } from "./errors";

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const isSafeManifestPathValue = (
  value: string,
  userId: string,
  docId: string,
): boolean => isHttpUrl(value) || isScopedStoragePath(value, userId, docId);

const validateSlides = (
  slides: unknown,
  userId: string,
  docId: string,
): number | null => {
  if (slides === undefined) {
    return null;
  }

  if (!Array.isArray(slides)) {
    throw createPptxConversionError("manifest_slides_invalid_type");
  }

  for (const slide of slides) {
    if (typeof slide !== "object" || slide === null || Array.isArray(slide)) {
      throw createPptxConversionError("manifest_slide_invalid_entry");
    }

    const slideRecord = slide as Record<string, unknown>;

    const slidePath = asNonEmptyString(slideRecord.path);
    if (slidePath && !isSafeManifestPathValue(slidePath, userId, docId)) {
      throw createPptxConversionError("manifest_slide_path_scope_violation");
    }

    const slideUrl = asNonEmptyString(slideRecord.url);
    if (slideUrl && !isSafeManifestPathValue(slideUrl, userId, docId)) {
      throw createPptxConversionError("manifest_slide_url_scope_violation");
    }
  }

  return slides.length;
};

export const parseManifestContents = (
  contents: string,
  manifestPath: string,
  userId: string,
  docId: string,
): ResolvedManifestMetadata => {
  let parsedRaw: unknown;

  try {
    parsedRaw = JSON.parse(contents);
  } catch {
    throw createPptxConversionError("manifest_invalid_json");
  }

  if (
    typeof parsedRaw !== "object" ||
    parsedRaw === null ||
    Array.isArray(parsedRaw)
  ) {
    throw createPptxConversionError("manifest_invalid_shape");
  }

  const parsed = parsedRaw as Record<string, unknown> &
    Partial<ManifestPayload>;

  const manifestDocId = asNonEmptyString(parsed.docId);
  if (manifestDocId && manifestDocId !== docId) {
    throw createPptxConversionError("manifest_docid_mismatch");
  }

  const manifestUserId = asNonEmptyString(parsed.userId);
  if (manifestUserId && manifestUserId !== userId) {
    throw createPptxConversionError("manifest_userid_mismatch");
  }

  const slideCountFromField = asFiniteNumber(parsed.slideCount);
  const slideCountFromSlides = validateSlides(parsed.slides, userId, docId);

  const fallbackPdfPath = asNonEmptyString(parsed.fallbackPdfPath);
  if (
    fallbackPdfPath &&
    !isSafeManifestPathValue(fallbackPdfPath, userId, docId)
  ) {
    throw createPptxConversionError("manifest_fallback_scope_violation");
  }

  return {
    manifestPath,
    slideCount: slideCountFromField ?? slideCountFromSlides,
    fallbackPdfPath: fallbackPdfPath ?? null,
  };
};
