/**
 * Flashcard のインク編集に関する state/ref/handler を集約した hook
 *
 * - layoutStable 判定（fonts / image load / ResizeObserver）
 * - debounce 保存（side を ref で保持し flip 時の保存先ミスを防ぐ）
 * - unmount 時 flush
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  INK_DOCUMENT_VERSION,
  type InkDocument,
  type InkEditTool,
} from "@/components/ink/inkTypes";
import {
  type InkHistoryState,
  type InkLayerHandle,
} from "@/components/ink/InkLayer";
import { useCards } from "@/hooks/card/useCards";

interface UseFlashcardInkOptions {
  cardId: string | null;
  effectiveIsFlipped: boolean;
  showInkLayer: boolean;
  inkEditingEnabled: boolean;
  previewMode: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
  onInkDocumentChange?: (
    side: "question" | "answer",
    nextDocument: InkDocument,
  ) => void;
}

export interface FlashcardInkResult {
  previewInkRef: React.RefObject<InkLayerHandle | null>;
  previewInkTool: InkEditTool | null;
  setPreviewInkTool: React.Dispatch<React.SetStateAction<InkEditTool | null>>;
  previewInkHistory: InkHistoryState;
  setPreviewInkHistory: React.Dispatch<React.SetStateAction<InkHistoryState>>;
  layoutStable: boolean;
  shouldMountInkLayer: boolean;
  handleInkDocumentChange: (
    side: "question" | "answer",
    nextDocument: InkDocument,
  ) => void;
}

export function useFlashcardInk({
  cardId,
  effectiveIsFlipped,
  showInkLayer,
  inkEditingEnabled,
  previewMode,
  contentRef,
  onInkDocumentChange,
}: UseFlashcardInkOptions): FlashcardInkResult {
  const { updateCard } = useCards();

  const previewInkRef = useRef<InkLayerHandle | null>(null);
  const [previewInkTool, setPreviewInkTool] = useState<InkEditTool | null>(
    null,
  );
  const [previewInkHistory, setPreviewInkHistory] = useState<InkHistoryState>({
    canUndo: false,
    canRedo: false,
    strokeCount: 0,
  });
  const [layoutStable, setLayoutStable] = useState(false);

  // ✅ side も含めて保持（debounce中のflipでも保存先を間違えない）
  const pendingInkRef = useRef<{
    side: "question" | "answer";
    doc: InkDocument;
  } | null>(null);
  const inkSaveTimerRef = useRef<number | null>(null);

  // tool の有無を inkEditingEnabled に連動
  useEffect(() => {
    if (!inkEditingEnabled) {
      queueMicrotask(() => setPreviewInkTool(null));
      return;
    }
    queueMicrotask(() => setPreviewInkTool((prev) => prev ?? "pen"));
  }, [inkEditingEnabled]);

  // layoutStable 判定（fonts / image load / ResizeObserver）
  useEffect(() => {
    if (!showInkLayer) {
      queueMicrotask(() => setLayoutStable(false));
      return;
    }

    let cancelled = false;
    let settleTimer: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const scheduleStable = () => {
      if (cancelled) return;
      if (settleTimer != null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (!cancelled) setLayoutStable(true);
      }, 250);
    };

    const init = async () => {
      setLayoutStable(false);

      const fontsReady = (
        document as Document & { fonts?: { ready?: Promise<unknown> } }
      ).fonts?.ready;
      if (fontsReady && typeof fontsReady.then === "function") {
        try {
          await fontsReady;
        } catch {
          // ignore
        }
      }
      if (cancelled) return;

      const root = contentRef.current;
      if (!root) {
        scheduleStable();
        return;
      }

      const images = Array.from(root.querySelectorAll("img"));
      const imageWaiters = images
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise<void>((resolve) => {
              const done = () => {
                img.removeEventListener("load", done);
                img.removeEventListener("error", done);
                resolve();
              };
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            }),
        );

      if (imageWaiters.length > 0) await Promise.allSettled(imageWaiters);
      if (cancelled) return;

      scheduleStable();

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          setLayoutStable(false);
          scheduleStable();
        });
        resizeObserver.observe(root);
      }
    };

    void init();
    return () => {
      cancelled = true;
      if (settleTimer != null) window.clearTimeout(settleTimer);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [cardId, effectiveIsFlipped, showInkLayer, previewMode, contentRef]);

  const flushPendingInk = useCallback(() => {
    if (!cardId) return;
    const pending = pendingInkRef.current;
    if (!pending) return;
    pendingInkRef.current = null;
    updateCard(
      cardId,
      pending.side === "question"
        ? { front: { ink: pending.doc } }
        : { back: { ink: pending.doc } },
    ).catch((error) => {
      console.error("[Flashcard] Failed to persist ink document", error);
    });
  }, [cardId, updateCard]);

  const handleInkDocumentChange = useCallback(
    (side: "question" | "answer", nextDocument: InkDocument) => {
      const next: InkDocument = {
        ...nextDocument,
        version: nextDocument.version ?? INK_DOCUMENT_VERSION,
        updatedAt: Date.now(),
      };

      onInkDocumentChange?.(side, next);

      // ✅ side も一緒に保持
      pendingInkRef.current = { side, doc: next };

      if (inkSaveTimerRef.current != null)
        window.clearTimeout(inkSaveTimerRef.current);
      inkSaveTimerRef.current = window.setTimeout(() => {
        flushPendingInk();
        inkSaveTimerRef.current = null;
      }, 300);
    },
    [flushPendingInk, onInkDocumentChange],
  );

  // unmount 時に pending を flush
  useEffect(() => {
    return () => {
      if (inkSaveTimerRef.current != null)
        window.clearTimeout(inkSaveTimerRef.current);
      flushPendingInk();
    };
  }, [flushPendingInk]);

  // ✅ stable になってからマウント（書けない/ズレないを優先）
  const shouldMountInkLayer = Boolean(
    showInkLayer && cardId && layoutStable,
  );

  return {
    previewInkRef,
    previewInkTool,
    setPreviewInkTool,
    previewInkHistory,
    setPreviewInkHistory,
    layoutStable,
    shouldMountInkLayer,
    handleInkDocumentChange,
  };
}







