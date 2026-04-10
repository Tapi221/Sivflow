import { ResolvedManifestMetadata } from "../domain/conversionTypes";
import { toSafeErrorMessage } from "../domain/errors";
import {
  isEndpointUnavailableError,
  requestExternalConversion,
} from "../infrastructure/external/converterClient";
import {
  buildDefaultManifestPath,
  readManifestMetadata,
} from "../infrastructure/storage/manifestRepository";

export const executePptxConversion = async ({
  userId,
  docId,
  sourceStoragePath,
}: {
  userId: string;
  docId: string;
  sourceStoragePath: string;
}): Promise<ResolvedManifestMetadata> => {
  const defaultManifestPath = buildDefaultManifestPath({ userId, docId });

  try {
    const external = await requestExternalConversion({
      userId,
      docId,
      sourceStoragePath,
    });

    const stored = await readManifestMetadata({
      manifestPath: external.manifestPath,
      userId,
      docId,
    });

    return {
      manifestPath: stored.manifestPath,
      slideCount: external.slideCount ?? stored.slideCount,
      fallbackPdfPath: external.fallbackPdfPath ?? stored.fallbackPdfPath,
    };
  } catch (error) {
    if (!isEndpointUnavailableError(error)) {
      throw error;
    }

    console.warn(
      "[PptxConversion] Converter endpoint unavailable, falling back to storage manifest",
      {
        userId,
        docId,
        sourceStoragePath,
        error: toSafeErrorMessage(error),
      },
    );

    return readManifestMetadata({
      manifestPath: defaultManifestPath,
      userId,
      docId,
    });
  }
};
