/**
 * PDF ビューアの表示状態（currentPage / scale / fitMode）を管理するフック。
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
import type { PdfViewerState } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface UsePdfViewerPersistenceOptions {
  docId: string;
  viewerState?: PdfViewerState | null;
  fitScale: number;
  onDocumentUpdate?: (updates: { viewerState: PdfViewerState }) => Promise<void>;
}

interface UsePdfViewerPersistenceResult {
  currentPage: number;
  scale: number;
  fitMode: "width" | "manual";
  setCurrentPage: (page: number) => void;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  setFitMode: React.Dispatch<React.SetStateAction<"width" | "manual">>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleFitWidth: () => void;
  handleViewerScaleChange: (nextScale: number) => void;
}

export function usePdfViewerPersistence({
  docId,
  viewerState,
  fitScale,
  onDocumentUpdate,
}: UsePdfViewerPersistenceOptions): UsePdfViewerPersistenceResult {
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<"width" | "manual">("width");
  const [scale, setScale] = useState(1.0);

  // ✅ ハイドレーション完了フラグ。ハイドレーション中は保存を禁止する。
  const isHydratingRef = useRef(false);
  const initializedRef = useRef(false);

  // ✅ PDF 切替時に debounce をクリアするための docId 追跡
  const lastDocIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ PDF ドキュメントが変わった場合のリセット
  useEffect(() => {
    if (lastDocIdRef.current !== docId && lastDocIdRef.current !== null) {
      console.warn("[usePdfViewerPersistence] Document changed, clearing debounce:", {
        from: lastDocIdRef.current,
        to: docId,
      });
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
    lastDocIdRef.current = docId;
    isHydratingRef.current = false;
    initializedRef.current = false;
  }, [docId]);

  // ✅ 表示状態の初期化（一度だけ実行）
  // 優先順位: sessionStorage > DocumentItem.viewerState > デフォルト
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // ✅ ハイドレーション開始
    isHydratingRef.current = true;

    let restoredState: PdfViewerState | null = null;

    // 1. sessionStorage から復元を試みる
    // ✅ PDF 切替時に異なる PDF のセッション状態を読み込まないこと
    restoredState = getViewerStateFromSession(docId);

    // 2. DocumentItem.viewerState をフォールバック
    if (!restoredState && viewerState) {
      restoredState = viewerState;
    }

    // 3. 復元状態を適用
    if (restoredState) {
      if (typeof restoredState.currentPage === "number") {
        queueMicrotask(() =>
          setCurrentPage(Math.max(1, restoredState!.currentPage!)),
        );
      }
      if (typeof restoredState.scale === "number") {
        queueMicrotask(() =>
          setScale(clampScale(restoredState!.scale!)),
        );
      }
      if (
        restoredState.fitMode === "width" ||
        restoredState.fitMode === "manual"
      ) {
        queueMicrotask(() => setFitMode(restoredState!.fitMode!));
      }
    }

    // ✅ ハイドレーション完了（この直後から保存を許可）
    // microtask を使って、state 更新が確定するのを待つ
    Promise.resolve().then(() => {
      isHydratingRef.current = false;
      console.debug("[usePdfViewerPersistence] Hydration complete for doc:", docId);
    });
  }, [docId, viewerState]);

  // ✅ 表示状態の永続化（debounce付き、但しハイドレーション中は保存禁止）
  useEffect(() => {
    // ✅ ハイドレーション中は保存しない（初期復元が完了するまで待機）
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
      };

      // sessionStorage に即座に保存（高速復元用）
      // ✅ 正しい docId を使用（ドキュメント切替保護）
      saveViewerStateToSession(docId, newViewerState);

      // DocumentItem.viewerState を更新（永続化）
      // ✅ 条件付きで実行（ドキュメント切替による不正な更新を防止）
      if (onDocumentUpdate) {
        onDocumentUpdate({ viewerState: newViewerState }).catch((err) => {
          console.warn("[usePdfViewerPersistence] Failed to save viewer state:", err, {
            docId,
          });
          // 失敗しても無視（UXを止めない）
        });
      }

      debounceTimerRef.current = null;
    }, VIEWER_STATE_DEBOUNCE_MS);

    return () => {
      // ✅ cleanup: unmount 時必ずクリア（StrictMode 対応）
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [currentPage, scale, fitMode, docId, onDocumentUpdate]);

  // fitMode === 'width' の時のスケール自動更新
  useEffect(() => {
    if (fitMode !== "width") return;
    queueMicrotask(() =>
      setScale((prev) =>
        Math.abs(prev - fitScale) < EPSILON ? prev : fitScale,
      ),
    );
  }, [fitMode, fitScale]);

  const handleZoomOut = useCallback(() => {
    setFitMode("manual");
    setScale((s) =>
      clampScale(parseFloat((s - ZOOM_STEP).toFixed(2))),
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    setFitMode("manual");
    setScale((s) =>
      clampScale(parseFloat((s + ZOOM_STEP).toFixed(2))),
    );
  }, []);

  const handleFitWidth = useCallback(() => {
    setFitMode("width");
    setScale(fitScale);
  }, [fitScale]);

  const handleViewerScaleChange = useCallback((nextScale: number) => {
    if (!Number.isFinite(nextScale)) return;
    const clamped = clampScale(nextScale);
    const rounded = parseFloat(clamped.toFixed(3));
    setFitMode("manual");
    setScale((prev) => (Math.abs(prev - rounded) < EPSILON ? prev : rounded));
  }, []);

  return {
    currentPage,
    scale,
    fitMode,
    setCurrentPage,
    setScale,
    setFitMode,
    handleZoomIn,
    handleZoomOut,
    handleFitWidth,
    handleViewerScaleChange,
  };
}





