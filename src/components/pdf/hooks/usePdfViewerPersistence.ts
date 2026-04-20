/**
 * PDF ビューアの表示状態（currentPage / zoomPercent / fitMode / pageLayoutMode）を管理するフック。
 *
 * 0-100% のズーム UI を fitScale 基準で解釈し、touchpad gesture 側の拡大とは分離する。
 * 永続化時は zoomPercent を正規化して保存し、旧 scale ベースの状態も読み込めるようにする。
 */
import {
  EPSILON,
  clampScale,
  getViewerStateFromSession,
  saveViewerStateToSession,
  VIEWER_STATE_DEBOUNCE_MS,
} from "@/components/pdf/pdfViewerStateStorage";
import {
  clampPdfBarZoomPercent,
  resolvePdfBarRenderScale,
  resolvePdfBarZoomPercentFromRenderScale,
} from "@/components/pdf/pdfBarZoomPolicy";
import { PDF_BAR_MAX_PERCENT } from "@constants/web/pdf";
import type { PdfPageLayoutMode, PdfViewerState } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UsePdfViewerPersistenceOptions {
  docId: string;
  viewerState?: PdfViewerState | null;
  getFitScale: (pageLayoutMode: PdfPageLayoutMode) => number;
  isFitScaleReady: boolean;
  onDocumentUpdate?: (updates: {
    viewerState: PdfViewerState;
  }) => Promise<void>;
}

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const resolvePageLayoutMode = (
  viewerState: PdfViewerState | null | undefined,
): PdfPageLayoutMode => {
  return viewerState?.pageLayoutMode === "double" ? "double" : "single";
};

const resolveFitMode = (
  viewerState: PdfViewerState | null | undefined,
): "width" | "manual" => {
  return viewerState?.fitMode === "manual" ? "manual" : "width";
};

export const usePdfViewerPersistence = ({
  docId,
  viewerState,
  getFitScale,
  isFitScaleReady,
  onDocumentUpdate,
}: UsePdfViewerPersistenceOptions) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<"width" | "manual">("width");
  const [zoomPercent, setZoomPercent] = useState(PDF_BAR_MAX_PERCENT);
  const [pageLayoutMode, setPageLayoutMode] =
    useState<PdfPageLayoutMode>("single");

  const isHydratingRef = useRef(false);
  const initializedRef = useRef(false);
  const lastDocIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLegacyScaleRef = useRef<number | null>(null);

  const fitScale = useMemo(() => {
    const nextFitScale = getFitScale(pageLayoutMode);

    return clampScale(Number.isFinite(nextFitScale) ? nextFitScale : 1);
  }, [getFitScale, pageLayoutMode]);

  const baseRenderScale = useMemo(() => {
    return resolvePdfBarRenderScale({
      zoomPercent,
      fitScale,
    });
  }, [fitScale, zoomPercent]);

  const finalizeHydration = useCallback(() => {
    Promise.resolve().then(() => {
      isHydratingRef.current = false;

      if (import.meta.env.DEV) {
        console.debug(
          "[usePdfViewerPersistence] Hydration complete for doc:",
          docId,
        );
      }
    });
  }, [docId]);

  useEffect(() => {
    if (lastDocIdRef.current !== docId && lastDocIdRef.current !== null) {
      if (import.meta.env.DEV) {
        console.warn(
          "[usePdfViewerPersistence] Document changed, clearing debounce:",
          {
            from: lastDocIdRef.current,
            to: docId,
          },
        );
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }

    lastDocIdRef.current = docId;
    isHydratingRef.current = false;
    initializedRef.current = false;
    pendingLegacyScaleRef.current = null;
  }, [docId]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    isHydratingRef.current = true;

    const restoredState =
      getViewerStateFromSession(docId) ?? viewerState ?? null;
    const restoredPageLayoutMode = resolvePageLayoutMode(restoredState);
    const restoredFitMode = resolveFitMode(restoredState);

    queueMicrotask(() => {
      if (isFiniteNumber(restoredState?.currentPage)) {
        setCurrentPage(Math.max(1, Math.trunc(restoredState.currentPage)));
      }

      setPageLayoutMode(restoredPageLayoutMode);
      setFitMode(restoredFitMode);
    });

    if (isFiniteNumber(restoredState?.zoomPercent)) {
      queueMicrotask(() => {
        setZoomPercent(clampPdfBarZoomPercent(restoredState.zoomPercent));
      });
      finalizeHydration();
      return;
    }

    if (restoredFitMode === "width") {
      queueMicrotask(() => {
        setZoomPercent(PDF_BAR_MAX_PERCENT);
      });
      finalizeHydration();
      return;
    }

    if (isFiniteNumber(restoredState?.scale)) {
      pendingLegacyScaleRef.current = clampScale(restoredState.scale);

      if (isFitScaleReady) {
        const nextRestoredFitScale = getFitScale(restoredPageLayoutMode);
        const restoredFitScale = clampScale(
          Number.isFinite(nextRestoredFitScale) ? nextRestoredFitScale : 1,
        );
        const migratedZoomPercent = resolvePdfBarZoomPercentFromRenderScale({
          renderScale: pendingLegacyScaleRef.current,
          fitScale: restoredFitScale,
        });

        pendingLegacyScaleRef.current = null;

        queueMicrotask(() => {
          setZoomPercent(migratedZoomPercent);
        });
        finalizeHydration();
        return;
      }

      return;
    }

    queueMicrotask(() => {
      setZoomPercent(PDF_BAR_MAX_PERCENT);
    });
    finalizeHydration();
  }, [
    docId,
    finalizeHydration,
    getFitScale,
    isFitScaleReady,
    viewerState,
  ]);

  useEffect(() => {
    if (pendingLegacyScaleRef.current === null || !isFitScaleReady) {
      return;
    }

    const migratedZoomPercent = resolvePdfBarZoomPercentFromRenderScale({
      renderScale: pendingLegacyScaleRef.current,
      fitScale,
    });

    pendingLegacyScaleRef.current = null;

    queueMicrotask(() => {
      setZoomPercent((previousZoomPercent) => {
        return previousZoomPercent === migratedZoomPercent
          ? previousZoomPercent
          : migratedZoomPercent;
      });
    });

    finalizeHydration();
  }, [finalizeHydration, fitScale, isFitScaleReady]);

  useEffect(() => {
    if (isHydratingRef.current) {
      if (import.meta.env.DEV) {
        console.debug(
          "[usePdfViewerPersistence] Skipping save during hydration",
        );
      }
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const nextViewerState: PdfViewerState = {
        currentPage,
        scale: Number(baseRenderScale.toFixed(3)),
        zoomPercent,
        fitMode,
        pageLayoutMode,
      };

      saveViewerStateToSession(docId, nextViewerState);

      if (onDocumentUpdate) {
        onDocumentUpdate({ viewerState: nextViewerState }).catch((error) => {
          console.warn(
            "[usePdfViewerPersistence] Failed to save viewer state:",
            error,
            {
              docId,
            },
          );
        });
      }

      debounceTimerRef.current = null;
    }, VIEWER_STATE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [
    baseRenderScale,
    currentPage,
    docId,
    fitMode,
    onDocumentUpdate,
    pageLayoutMode,
    zoomPercent,
  ]);

  const handleZoomOut = useCallback(() => {
    setFitMode("manual");
    setZoomPercent((previousZoomPercent) => {
      return clampPdfBarZoomPercent(previousZoomPercent - 1);
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setFitMode("manual");
    setZoomPercent((previousZoomPercent) => {
      return clampPdfBarZoomPercent(previousZoomPercent + 1);
    });
  }, []);

  const handleFitWidth = useCallback(() => {
    setFitMode("width");
    setZoomPercent((previousZoomPercent) => {
      return previousZoomPercent === PDF_BAR_MAX_PERCENT
        ? previousZoomPercent
        : PDF_BAR_MAX_PERCENT;
    });
  }, []);

  const handleViewerZoomPercentChange = useCallback((nextZoomPercent: number) => {
    if (!Number.isFinite(nextZoomPercent)) {
      return;
    }

    const clampedZoomPercent = clampPdfBarZoomPercent(nextZoomPercent);

    setFitMode("manual");
    setZoomPercent((previousZoomPercent) => {
      return Math.abs(previousZoomPercent - clampedZoomPercent) < EPSILON
        ? previousZoomPercent
        : clampedZoomPercent;
    });
  }, []);

  const handlePageLayoutModeChange = useCallback(
    (nextPageLayoutMode: PdfPageLayoutMode) => {
      setPageLayoutMode((previousPageLayoutMode) => {
        return previousPageLayoutMode === nextPageLayoutMode
          ? previousPageLayoutMode
          : nextPageLayoutMode;
      });
    },
    [],
  );

  return {
    currentPage,
    baseRenderScale,
    fitMode,
    fitScale,
    pageLayoutMode,
    zoomPercent,
    setCurrentPage,
    setFitMode,
    setPageLayoutMode,
    setZoomPercent,
    handleZoomIn,
    handleZoomOut,
    handleFitWidth,
    handleViewerZoomPercentChange,
    handlePageLayoutModeChange,
  };
};
