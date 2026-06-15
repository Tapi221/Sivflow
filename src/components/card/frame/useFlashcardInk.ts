import React, { useCallback, useEffect, useRef, useState } from "react";
import type { InkDocument, InkEditTool } from "@core/domain/card/ink/inkDocument";
import { INK_DOCUMENT_VERSION } from "@core/domain/card/ink/inkDocument";
import { useCards } from "@/components/card/hooks/useCards";
import type { InkHistoryState, InkLayerHandle } from "@/components/ink/inkLayer.types";



interface UseFlashcardInkOptions {
  cardId: string | null;
  effectiveIsFlipped: boolean;
  showInkLayer: boolean;
  inkEditingEnabled: boolean;
  previewMode: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
  onInkDocumentChange?: (side: "question" | "answer", nextDocument: InkDocument) => void;
}
interface FlashcardInkResult {
  previewInkRef: React.RefObject<InkLayerHandle | null>;
  previewInkTool: InkEditTool | null;
  setPreviewInkTool: React.Dispatch<React.SetStateAction<InkEditTool | null>>;
  previewInkHistory: InkHistoryState;
  setPreviewInkHistory: React.Dispatch<React.SetStateAction<InkHistoryState>>;
  layoutStable: boolean;
  shouldMountInkLayer: boolean;
  handleInkDocumentChange: (side: "question" | "answer", nextDocument: InkDocument) => void;
}



const readFontsReady = () => (document as Document & { fonts?: { ready?: Promise<unknown>; }; }).fonts?.ready;
const waitForImages = async (root: HTMLDivElement) => {
  const images = Array.from(root.querySelectorAll("img")).filter((img) => !img.complete);
  await Promise.allSettled(images.map((img) => new Promise<void>((resolve) => {
    const done = () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
      resolve();
    };
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  })));
};
const useFlashcardInk = ({ cardId, effectiveIsFlipped, showInkLayer, inkEditingEnabled, previewMode, contentRef, onInkDocumentChange }: UseFlashcardInkOptions) => {
  const { updateCard } = useCards();
  const previewInkRef = useRef<InkLayerHandle | null>(null);
  const [previewInkTool, setPreviewInkTool] = useState<InkEditTool | null>(null);
  const [previewInkHistory, setPreviewInkHistory] = useState<InkHistoryState>({ canUndo: false, canRedo: false, strokeCount: 0 });
  const [layoutStable, setLayoutStable] = useState(false);
  const pendingInkRef = useRef<{ side: "question" | "answer"; doc: InkDocument; } | null>(null);
  const inkSaveTimerRef = useRef<number | null>(null);
  const inkEditingEnabledRef = useRef(inkEditingEnabled);

  useEffect(() => {
    inkEditingEnabledRef.current = inkEditingEnabled;
  }, [inkEditingEnabled]);

  useEffect(() => {
    queueMicrotask(() => setPreviewInkTool(inkEditingEnabled ? (prev) => prev ?? "pen" : null));
  }, [inkEditingEnabled]);

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
      if ((settleTimer !== null && settleTimer !== undefined)) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (!cancelled) setLayoutStable(true);
      }, 250);
    };

    const init = async () => {
      setLayoutStable(false);
      try {
        await readFontsReady();
      } catch {
        // ignore
      }
      if (cancelled) return;
      const root = contentRef.current;
      if (!root) {
        scheduleStable();
        return;
      }
      await waitForImages(root);
      if (cancelled) return;
      scheduleStable();
      if (inkEditingEnabledRef.current && typeof ResizeObserver !== "undefined") {
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
      if ((settleTimer !== null && settleTimer !== undefined)) window.clearTimeout(settleTimer);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [cardId, effectiveIsFlipped, showInkLayer, previewMode, contentRef]);

  const flushPendingInk = useCallback(() => {
    if (!cardId) return;
    const pending = pendingInkRef.current;
    if (!pending) return;
    pendingInkRef.current = null;
    const patch = pending.side === "question" ? { front: { ink: pending.doc } } : { back: { ink: pending.doc } };
    updateCard(cardId, patch).catch((error) => {
      console.error("[Flashcard] Failed to persist ink document", error);
    });
  }, [cardId, updateCard]);

  const handleInkDocumentChange = useCallback((side: "question" | "answer", nextDocument: InkDocument) => {
    const next: InkDocument = { ...nextDocument, version: nextDocument.version ?? INK_DOCUMENT_VERSION, updatedAt: Date.now() };
    onInkDocumentChange?.(side, next);
    pendingInkRef.current = { side, doc: next };
    if ((inkSaveTimerRef.current !== null && inkSaveTimerRef.current !== undefined)) window.clearTimeout(inkSaveTimerRef.current);
    inkSaveTimerRef.current = window.setTimeout(() => {
      flushPendingInk();
      inkSaveTimerRef.current = null;
    }, 300);
  }, [flushPendingInk, onInkDocumentChange]);

  useEffect(() => {
    return () => {
      if ((inkSaveTimerRef.current !== null && inkSaveTimerRef.current !== undefined)) window.clearTimeout(inkSaveTimerRef.current);
      flushPendingInk();
    };
  }, [flushPendingInk]);

  return {
    previewInkRef,
    previewInkTool,
    setPreviewInkTool,
    previewInkHistory,
    setPreviewInkHistory,
    layoutStable,
    shouldMountInkLayer: Boolean(showInkLayer && cardId && layoutStable),
    handleInkDocumentChange,
  };
};



export { useFlashcardInk };


export type { FlashcardInkResult };
