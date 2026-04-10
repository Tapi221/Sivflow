import { ResolvedManifestMetadata } from "../domain/conversionTypes";
import { createPptxConversionError } from "../domain/errors";
import { savePlaceholderManifest } from "../infrastructure/storage/manifestRepository";
import {
  hasUnsafePathFragments,
  isPlaceholderImplementationEnabled,
  isScopedStoragePath,
} from "../security/guards";

export const executePlaceholderPptxConversion = async ({
  userId,
  docId,
  sourceStoragePath,
}: {
  userId: string;
  docId: string;
  sourceStoragePath: string;
}): Promise<ResolvedManifestMetadata> => {
  if (!isPlaceholderImplementationEnabled()) {
    throw createPptxConversionError("converter_placeholder_disabled", 503);
  }

  if (!isScopedStoragePath(sourceStoragePath, userId, docId)) {
    throw createPptxConversionError("source_scope_violation", 400);
  }

  if (hasUnsafePathFragments(sourceStoragePath)) {
    throw createPptxConversionError("source_path_unsafe", 400);
  }

  return savePlaceholderManifest({
    userId,
    docId,
    sourceStoragePath,
  });
};
