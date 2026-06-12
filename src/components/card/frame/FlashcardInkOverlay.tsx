import React from "react";
import type { InkDocument, InkEditTool } from "@core/domain/card/ink/inkDocument";
import { InkLayer, InkToolbar } from "@/components/ink/InkLayer";
import type { InkHistoryState, InkLayerHandle } from "@/components/ink/inkLayer.types";



interface FlashcardInkOverlayProps {
  extraHeaderRight?: React.ReactNode;
  extraFooter?: React.ReactNode;
  previewMode: boolean;
  showInkLayer: boolean;
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



const FlashcardInkOverlay = ({ extraHeaderRight, extraFooter, previewMode, showInkLayer, inkEditingEnabled, cardId, activeInkSide, activeInkDocument, layoutStable, shouldMountInkLayer, previewInkRef, previewInkTool, previewInkHistory, onInkDocumentChange, setPreviewInkTool, setPreviewInkHistory }: FlashcardInkOverlayProps) => {
  const hasInkContent = (activeInkDocument.strokes?.length ?? 0) > 0;
  const hasHeaderOverlay = Boolean(extraHeaderRight && !previewMode);
  const hasFooterOverlay = Boolean(extraFooter);
  const hasInkOverlay = Boolean(showInkLayer && cardId && (hasInkContent || inkEditingEnabled));

  if (!hasHeaderOverlay && !hasFooterOverlay && !hasInkOverlay) return null;

  return (
    <>
      {hasHeaderOverlay && (
        <div className="absolute right-2 top-2 z-30 pointer-events-none">
          <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>{extraHeaderRight}</div>
        </div>
      )}

      {hasFooterOverlay && (
        <div className="absolute inset-x-0 bottom-2 z-30 pointer-events-none">
          <div className="flex justify-center pointer-events-auto" onClick={(e) => e.stopPropagation()}>{extraFooter}</div>
        </div>
      )}

      {hasInkOverlay && (
        <>
          {shouldMountInkLayer && hasInkOverlay && (
            <InkLayer
              ref={previewInkRef}
              cardId={cardId}
              side={activeInkSide}
              editable={Boolean(inkEditingEnabled && layoutStable)}
              tool={previewInkTool ?? "pen"}
              value={activeInkDocument}
              onChange={(next) => onInkDocumentChange(activeInkSide, next)}
              onHistoryChange={setPreviewInkHistory}
            />
          )}

          {inkEditingEnabled && layoutStable && (
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
};



export { FlashcardInkOverlay };
