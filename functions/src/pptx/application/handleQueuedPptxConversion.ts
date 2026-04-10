import { normalizeConversionStatus } from "../domain/conversionTypes";
import { toSafeErrorMessage } from "../domain/errors";
import {
  claimQueuedConversion,
  markConversionFailed,
  markConversionReady,
} from "../infrastructure/firestore/conversionRepository";
import {
  markDocumentFailed,
  markDocumentProcessing,
  markDocumentReady,
} from "../infrastructure/firestore/documentRepository";
import { executePptxConversion } from "./executePptxConversion";
import { asNonEmptyString, isScopedStoragePath } from "../security/guards";

const failConversion = async ({
  userId,
  docId,
  reason,
}: {
  userId: string;
  docId: string;
  reason: string;
}): Promise<void> => {
  await markConversionFailed({ userId, docId, reason });
  await markDocumentFailed({ userId, docId, reason });
};

export const handleQueuedPptxConversion = async ({
  userId,
  docId,
  afterData,
}: {
  userId: string;
  docId: string;
  afterData: Record<string, unknown>;
}): Promise<void> => {
  const nextStatus = normalizeConversionStatus(afterData.status);

  if (nextStatus !== "queued") {
    return;
  }

  if (!userId || !docId) {
    console.warn("[PptxConversion] Missing userId/docId in trigger context", {
      userId,
      docId,
    });
    return;
  }

  const sourceStoragePath = asNonEmptyString(afterData.sourceStoragePath);

  if (!sourceStoragePath) {
    await failConversion({
      userId,
      docId,
      reason: "source_storage_path_missing",
    });
    return;
  }

  if (!isScopedStoragePath(sourceStoragePath, userId, docId)) {
    await failConversion({
      userId,
      docId,
      reason: "source_storage_path_scope_violation",
    });
    return;
  }

  const claimed = await claimQueuedConversion({ userId, docId });
  if (!claimed) {
    return;
  }

  await markDocumentProcessing({ userId, docId });

  try {
    const result = await executePptxConversion({
      userId,
      docId,
      sourceStoragePath,
    });

    await markConversionReady({
      userId,
      docId,
      ...result,
    });

    await markDocumentReady({
      userId,
      docId,
      ...result,
    });

    console.info("[PptxConversion] Conversion succeeded", {
      userId,
      docId,
      manifestPath: result.manifestPath,
      slideCount: result.slideCount,
    });
  } catch (error) {
    const reason = toSafeErrorMessage(error);

    console.error("[PptxConversion] Conversion failed", {
      userId,
      docId,
      sourceStoragePath,
      error,
    });

    await failConversion({
      userId,
      docId,
      reason,
    });
  }
};
