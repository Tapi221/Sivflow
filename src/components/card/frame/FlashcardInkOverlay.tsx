/**
 * Flashcard の Ink overlay（InkLayer / InkToolbar / loading mask）と
 * extraHeaderRight / extraFooter の overlay を担うコンポーネント。
 *
 * Flashcard.tsx の overlayNode useMemo をコンポーネント化し、
 * React が差分を判断できる単位に分割している。
 */
import React from "react";
import { InkLayer, InkToolbar } from "@/components/ink/InkLayer";
import type { InkDocument } from "@/components/ink/inkTypes";
import type { InkLayerHandle, InkHistoryState } from "@/components/ink/InkLayer";
import type { InkEditTool } from "@/components/ink/inkTypes";

interface FlashcardInkOverlayProps {
  // extraHeader / footer
  extraHeaderRight?: React.ReactNode;
  extraFooter?: React.ReactNode;
  previewMode: boolean;
  // ink
  inkEditingEnabled: boolean;
  cardId: string | null;
  activeInkSide: "question" | "answer";
  activeInkDocument: ReturnType<typeof import("@/components/ink/inkStorage").resolveInkDocument>;
  layoutStable: boolean;
  shouldMountInkLayer: boolean;
  previewInkRef: React.RefObject<InkLayerHandle | null>;
  previewInkTool: InkEditTool | null;
  previewInkHistory: InkHistoryState;
  onInkDocumentChange: (side: "question" | "answer", next: InkDocument) => void;
  setPreviewInkTool: React.Dispatch<React.SetStateAction<InkEditTool | null>>;
  setPreviewInkHistory: React.Dispatch<React.SetStateAction<InkHistoryState>>;
}

export function FlashcardInkOverlay({
  extraHeaderRight,
  extraFooter,
  previewMode,
  inkEditingEnabled,
  cardId,
  activeInkSide,
  activeInkDocument,
  layoutStable,
  shouldMountInkLayer,
  previewInkRef,
  previewInkTool,
  previewInkHistory,
  onInkDocumentChange,
  setPreviewInkTool,
  setPreviewInkHistory,
}: FlashcardInkOverlayProps) {
  const hasHeaderOverlay = Boolean(extraHeaderRight && !previewMode);
  const hasFooterOverlay = Boolean(extraFooter);
  const hasInkOverlay = Boolean(previewMode && inkEditingEnabled && cardId);

  if (!hasHeaderOverlay && !hasFooterOverlay && !hasInkOverlay) return null;

  return (
    <>
      {hasHeaderOverlay && (
        <div className="absolute right-2 top-2 z-30 pointer-events-none">
          <div
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {extraHeaderRight}
          </div>
        </div>
      )}

      {hasFooterOverlay && (
        <div className="absolute inset-x-0 bottom-2 z-30 pointer-events-none">
          <div
            className="flex justify-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {extraFooter}
          </div>
        </div>
      )}

      {hasInkOverlay && (
        <>
          {shouldMountInkLayer && (
            <InkLayer
              ref={previewInkRef}
              cardId={cardId}
              side={activeInkSide}
              editable={Boolean(previewMode && inkEditingEnabled && layoutStable)}
              tool={previewInkTool ?? "pen"}
              value={activeInkDocument}
              onChange={(next) => onInkDocumentChange(activeInkSide, next)}
              onHistoryChange={setPreviewInkHistory}
            />
          )}

          {previewMode && inkEditingEnabled && !layoutStable && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/25 text-slate-600 text-xs font-semibold">
              レイアウト準備中...
            </div>
          )}

          {previewMode && inkEditingEnabled && layoutStable && (
            <div className="absolute bottom-2 left-2 z-30 pointer-events-auto">
              <InkToolbar
                tool={previewInkTool}
                canUndo={previewInkHistory.canUndo}
                canRedo={previewInkHistory.canRedo}
                onToolChange={setPreviewInkTool}
                onUndo={() => previewInkRef.current?.undo()}
                onRedo={() => previewInkRef.current?.redo()}
                onClear={() => previewInkRef.current?.clear()}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}




