import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../../shared/firebaseAdmin";
import { ResolvedManifestMetadata } from "../../domain/conversionTypes";

type DocumentIdentity = {
  userId: string;
  docId: string;
};

const getDocumentRef = ({ userId, docId }: DocumentIdentity) =>
  db.doc(`users/${userId}/documents/${docId}`);

export const markDocumentProcessing = async ({
  userId,
  docId,
}: DocumentIdentity): Promise<void> => {
  await getDocumentRef({ userId, docId }).set(
    {
      convertStatus: "processing",
      pptxManifestStatus: "processing",
      pptxLastError: null,
      pptx: {
        error: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

export const markDocumentReady = async ({
  userId,
  docId,
  manifestPath,
  slideCount,
  fallbackPdfPath,
}: DocumentIdentity & ResolvedManifestMetadata): Promise<void> => {
  await getDocumentRef({ userId, docId }).set(
    {
      convertStatus: "ready",
      pptxManifestStatus: "ready",
      pptxManifestPath: manifestPath,
      pptxSlideCount: slideCount ?? null,
      pptxLastError: null,
      pptxConvertedAt: FieldValue.serverTimestamp(),
      pptx: {
        manifestPath,
        fallbackPdfPath: fallbackPdfPath ?? null,
        slideCount: slideCount ?? null,
        error: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

export const markDocumentFailed = async ({
  userId,
  docId,
  reason,
}: DocumentIdentity & { reason: string }): Promise<void> => {
  await getDocumentRef({ userId, docId }).set(
    {
      convertStatus: "failed",
      pptxManifestStatus: "failed",
      pptxLastError: reason,
      pptx: {
        error: reason,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};
