/**
 * PDF ビューアの表示状態（currentPage / scale / fitMode / pageLayoutMode）を管理するフック。
 *
 * === 安定性保証 ===
 * ✅ 初期復元と永続保存の分離
 *    - ハイドレーション中は onDocumentUpdate を呼ばない
 *    - Promise.resolve() で state 確定を待機してから hydration 完了
 *
 * ✅ debounce の安全性
 *    - unmount 時に必ず cleanup（StrictMode 対応）
 *    - doc.id 変更時に古い debounce をクリア
 *    - 800ms debounce で不要な書き込みを削減
 *
 * ✅ ドキュメント切替時の分離
 *    - sessionStorage キーは docId 単位（`pdf_viewer_${docId}`）
 *    - docId 変更時に isHydratingRef をリセット
 *    - PDF A の viewerState が PDF B に適用されない
 */
import {
  clampScale,
  EPSILON,
  getViewerStateFromSession,
  saveViewerStateToSession,
  VIEWER_STATE_DEBOUNCE_MS,
  ZOOM_STEP,
} from "@/components/pdf/pdfViewerStateStorage";
import type { PdfPageLayoutMode, PdfViewerState } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface UsePdfViewerPersistenceOptions {
  docId: string;
  viewerState?: PdfViewerState | null;
  getFitScale: (pageLayoutMode: PdfPageLayoutMode) => number;
  onDocumentUpdate?: (updates: {
    viewerState: PdfViewerState;
  }) => Promise<void>;
}

export const usePdfViewerPersistence = ({
  docId,
  viewerState,
  getFitScale,
  onDocumentUpdate,
}: UsePdfViewerPersistenceOptions) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<"width" | "manual">("width");
  const [scale, setScale] = useState(1.0);
  const [pageLayoutMode, setPageLayoutMode] =
    useState<PdfPageLayoutMode>("single");

  const isHydratingRef = useRef(false);
  const initializedRef = useRef(false);

  const lastDocIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lastDocIdRef.current !== docId && lastDocIdRef.current !== null) {
      console.warn(
        "[usePdfViewerPersistence] Document changed, clearing debounce:",
        {
          from: lastDocIdRef.current,
          to: docId,
        },
      );
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
    lastDocIdRef.current = docId;
    isHydratingRef.current = false;
    initializedRef.current = false;
  }, [docId]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    isHydratingRef.current = true;

    let restoredState: PdfViewerState | null = null;

    restoredState = getViewerStateFromSession(docId);

    if (!restoredState && viewerState) {
      restoredState = viewerState;
    }

    if (restoredState) {
      if (typeof restoredState.currentPage === "number") {
        queueMicrotask(() =>
          setCurrentPage(Math.max(1, restoredState.currentPage ?? 1)),
        );
      }
      if (typeof restoredState.scale === "number") {
        queueMicrotask(() => setScale(clampScale(restoredState.scale ?? 1)));
      }
      if (
        restoredState.fitMode === "width" ||
        restoredState.fitMode === "manual"
      ) {
        queueMicrotask(() => setFitMode(restoredState.fitMode ?? "width"));
      }
      if (
        restoredState.pageLayoutMode === "single" ||
        restoredState.pageLayoutMode === "double"
      ) {
        queueMicrotask(() =>
          setPageLayoutMode(restoredState.pageLayoutMode ?? "single"),
        );
      }
    }

    Promise.resolve().then(() => {
      isHydratingRef.current = false;
      console.debug(
        "[usePdfViewerPersistence] Hydration complete for doc:",
        docId,
      );
    });
  }, [docId, viewerState]);

  useEffect(() => {
    if (isHydratingRef.current) {
      console.debug("[usePdfViewerPersistence] Skipping save during hydration");
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const newViewerState: PdfViewerState = {
        currentPage,
        scale: parseFloat(scale.toFixed(3)),
        fitMode,
        pageLayoutMode,
      };

      saveViewerStateToSession(docId, newViewerState);

      if (onDocumentUpdate) {
        onDocumentUpdate({ viewerState: newViewerState }).catch((err) => {
          console.warn(
            "[usePdfViewerPersistence] Failed to save viewer state:",
            err,
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
  }, [currentPage, scale, fitMode, pageLayoutMode, docId, onDocumentUpdate]);

  useEffect(() => {
    if (fitMode !== "width") return;

    const nextFitScale = getFitScale(pageLayoutMode);
    queueMicrotask(() =>
      setScale((previousScale) =>
        Math.abs(previousScale - nextFitScale) < EPSILON
          ? previousScale
          : nextFitScale,
      ),
    );
  }, [fitMode, getFitScale, pageLayoutMode]);

  const handleZoomOut = useCallback(() => {
    setFitMode("manual");
    setScale((previousScale) =>
      clampScale(parseFloat((previousScale - ZOOM_STEP).toFixed(2))),
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    setFitMode("manual");
    setScale((previousScale) =>
      clampScale(parseFloat((previousScale + ZOOM_STEP).toFixed(2))),
    );
  }, []);

  const handleFitWidth = useCallback(() => {
    setFitMode("width");
    setScale(getFitScale(pageLayoutMode));
  }, [getFitScale, pageLayoutMode]);

  const handleViewerScaleChange = useCallback((nextScale: number) => {
    if (!Number.isFinite(nextScale)) return;
    const clamped = clampScale(nextScale);
    const rounded = parseFloat(clamped.toFixed(3));
    setFitMode("manual");
    setScale((previousScale) =>
      Math.abs(previousScale - rounded) < EPSILON ? previousScale : rounded,
    );
  }, []);

  const handlePageLayoutModeChange = useCallback(
    (nextPageLayoutMode: PdfPageLayoutMode) => {
      setPageLayoutMode((previousPageLayoutMode) =>
        previousPageLayoutMode === nextPageLayoutMode
          ? previousPageLayoutMode
          : nextPageLayoutMode,
      );
    },
    [],
  );

  return {
    currentPage,
    scale,
    fitMode,
    pageLayoutMode,
    setCurrentPage,
    setScale,
    setFitMode,
    setPageLayoutMode,
    handleZoomIn,
    handleZoomOut,
    handleFitWidth,
    handleViewerScaleChange,
    handlePageLayoutModeChange,
  };
};
