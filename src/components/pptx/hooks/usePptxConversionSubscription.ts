/**
 * Subscribes to the Firestore pptxConversion record and writes derived state
 * back via applyLocalDocumentPatch. Pure I/O bridge — no UI concerns.
 */

import {
  getUpdatedAtMs,
  isWithinPendingWindow,
  normalizeConversionStatus,
  normalizeString,
} from "@/components/pptx/domain/pptxConversion";
import type { PptxConversionRecord } from "@/components/pptx/domain/pptxTypes";
import { firestoreDb } from "@/services/firebase";
import { pptxConversionDocPathSegments } from "@/services/firestorePaths";
import type { DocumentItem } from "@/types";
import {
  doc as firestoreDoc,
  onSnapshot,
  type DocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useRef } from "react";

interface Options {
  docId: string | undefined;
  userId: string | undefined;
  sourceSignature: string;
  manifestPendingWindowMs: number;
  applyLocalDocumentPatch: (patch: Partial<DocumentItem>) => Promise<void>;
  logDiagnostics: (message: string, payload?: Record<string, unknown>) => void;
}

export const usePptxConversionSubscription = ({
  docId,
  userId,
  sourceSignature,
  manifestPendingWindowMs,
  applyLocalDocumentPatch,
  logDiagnostics,
}: Options) => {
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !docId) return;
    const ref = firestoreDoc(
      firestoreDb,
      ...pptxConversionDocPathSegments(userId, docId),
    );
    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() as PptxConversionRecord;
        const status = normalizeConversionStatus(data.status);
        if (!status) return;

        const manifest = normalizeString(data.manifestPath);
        const fallbackPdfPath = normalizeString(data.fallbackPdfPath);
        const slideCountValue =
          typeof data.slideCount === "number" ? data.slideCount : null;
        const requestedAtMs = getUpdatedAtMs(data.createdAt) ?? Date.now();
        const convertedAtMs = getUpdatedAtMs(data.convertedAt);
        const errorMessage =
          normalizeString(data.errorMessage) ?? "conversion_failed";

        const signature = `${status}|${manifest ?? ""}|${fallbackPdfPath ?? ""}|${slideCountValue ?? ""}|${convertedAtMs ?? ""}|${errorMessage}`;
        if (lastSignatureRef.current === signature) return;
        lastSignatureRef.current = signature;

        logDiagnostics("conversion-status-updated", {
          docId,
          status,
          manifestPath: manifest,
          slideCount: slideCountValue,
          errorMessage: status === "failed" ? errorMessage : null,
        });

        if (status === "ready") {
          if (!manifest) {
            if (isWithinPendingWindow(requestedAtMs, manifestPendingWindowMs)) {
              void applyLocalDocumentPatch({
                convertStatus: "processing",
                pptxManifestStatus: "processing",
                pptxLastError: null,
                pptxConvertRequestedAt: requestedAtMs,
                pptxRetryCount: 0,
                pptxNextRetryAt: null,
                pptxSourceSignature: sourceSignature,
                pptx: {
                  error: null,
                  retryCount: 0,
                  nextRetryAt: null,
                  sourceSignature,
                  updatedAt: new Date(),
                },
              });
            } else {
              void applyLocalDocumentPatch({
                convertStatus: "failed",
                pptxManifestStatus: "failed",
                pptxLastError: "manifest_path_missing",
                pptx: {
                  error: "manifest_path_missing",
                  updatedAt: new Date(),
                },
              });
            }
            return;
          }

          void applyLocalDocumentPatch({
            convertStatus: "ready",
            pptxManifestStatus: "ready",
            pptxManifestPath: manifest,
            pptxSlideCount: slideCountValue,
            pptxLastError: null,
            pptxConvertedAt: convertedAtMs ?? Date.now(),
            pptxRetryCount: 0,
            pptxNextRetryAt: null,
            pptxSourceSignature: sourceSignature,
            pptx: {
              manifestPath: manifest,
              fallbackPdfPath,
              slideCount: slideCountValue,
              error: null,
              retryCount: 0,
              nextRetryAt: null,
              sourceSignature,
              updatedAt: new Date(convertedAtMs ?? Date.now()),
            },
          });
          return;
        }

        if (status === "failed") {
          void applyLocalDocumentPatch({
            convertStatus: "failed",
            pptxManifestStatus: "failed",
            pptxLastError: errorMessage,
            pptxRetryCount: 0,
            pptxNextRetryAt: null,
            pptxSourceSignature: sourceSignature,
            pptx: {
              error: errorMessage,
              retryCount: 0,
              nextRetryAt: null,
              sourceSignature,
              updatedAt: new Date(),
            },
          });
          return;
        }

        // queued / processing
        void applyLocalDocumentPatch({
          convertStatus: "processing",
          pptxManifestStatus: status,
          pptxLastError: null,
          pptxConvertRequestedAt: requestedAtMs,
          pptxRetryCount: 0,
          pptxNextRetryAt: null,
          pptxSourceSignature: sourceSignature,
          pptx: {
            error: null,
            retryCount: 0,
            nextRetryAt: null,
            sourceSignature,
            updatedAt: new Date(),
          },
        });
      },
      (error: unknown) => {
        console.error("[usePptxConversionSubscription] failed to subscribe", {
          docId,
          error,
        });
      },
    );
    return () => unsubscribe();
  }, [
    applyLocalDocumentPatch,
    docId,
    logDiagnostics,
    manifestPendingWindowMs,
    sourceSignature,
    userId,
  ]);
};
