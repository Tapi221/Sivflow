import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../../shared/firebaseAdmin";
import {
  ResolvedManifestMetadata,
  normalizeConversionStatus,
} from "../../domain/conversionTypes";

type ConversionIdentity = {
  userId: string;
  docId: string;
};

const getConversionRef = ({ userId, docId }: ConversionIdentity) =>
  db.doc(`users/${userId}/pptxConversions/${docId}`);

export const claimQueuedConversion = async ({
  userId,
  docId,
}: ConversionIdentity): Promise<boolean> =>
  db.runTransaction(async (tx) => {
    const ref = getConversionRef({ userId, docId });
    const snap = await tx.get(ref);

    if (!snap.exists) {
      return false;
    }

    const currentStatus = normalizeConversionStatus(
      (snap.data() as Record<string, unknown> | undefined)?.status,
    );

    if (currentStatus !== "queued") {
      return false;
    }

    tx.set(
      ref,
      {
        status: "processing",
        processingStartedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return true;
  });

export const markConversionReady = async ({
  userId,
  docId,
  manifestPath,
  slideCount,
  fallbackPdfPath,
}: ConversionIdentity & ResolvedManifestMetadata): Promise<void> => {
  await getConversionRef({ userId, docId }).set(
    {
      status: "ready",
      manifestPath,
      slideCount: slideCount ?? null,
      fallbackPdfPath: fallbackPdfPath ?? null,
      errorMessage: FieldValue.delete(),
      convertedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

export const markConversionFailed = async ({
  userId,
  docId,
  reason,
}: ConversionIdentity & { reason: string }): Promise<void> => {
  await getConversionRef({ userId, docId }).set(
    {
      status: "failed",
      errorMessage: reason,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};
