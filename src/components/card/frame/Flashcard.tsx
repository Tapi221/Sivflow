import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import {
    CANONICAL_CARD_WIDTH,
    layoutRowsToCardHeightPx,
} from "@/components/card/common/constants";
import type { InkDocument } from "@/components/ink/inkTypes";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { CardFrame } from "./CardFrame";
import { useFlashcardCornerControls } from "./FlashcardCornerControls";
import { FlashcardInkOverlay } from "./FlashcardInkOverlay";
import { FlashcardMediaDialogs } from "./FlashcardMediaDialogs";
import { FlashcardNavigation } from "./FlashcardNavigation";
import {
    type FlashcardCardLike,
} from "./flashcardDerived";
import { useFlashcardDerived } from "./useFlashcardDerived";
import { useFlashcardInk } from "./useFlashcardInk";
import { useFlashcardMediaState } from "./useFlashcardMediaState";

// Re-export for consumers who import the type from this file
export type { FlashcardCardLike };

interface FlashcardProps {
  card: FlashcardCardLike | null | undefined;
  isFlipped?: boolean;
  onFlip?: () => void;
  onEdit?: (card: FlashcardCardLike) => void;
  onToggleUncertainty?: (card: FlashcardCardLike) => void;
  onToggleBookmark?: (card: FlashcardCardLike) => void;
  className?: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  currentIndex?: number;
  totalCards?: number;
  previewMode?: boolean;
  extraHeaderLeft?: React.ReactNode;
  extraHeaderRight?: React.ReactNode;
  extraFooter?: React.ReactNode;
  drawMode?: boolean;
  inkEditingEnabled?: boolean;
  onInkDocumentChange?: (
    side: "question" | "answer",
    nextDocument: InkDocument,
  ) => void;
  allowUpscale?: boolean;
  maxScale?: number;
  scaleMultiplier?: number;
  contentPaddingPx?: number;
}

export function Flashcard({
  card,
  isFlipped,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
  className,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  currentIndex,
  totalCards,
  previewMode,
  extraHeaderLeft,
  extraHeaderRight,
  extraFooter,
  drawMode,
  inkEditingEnabled = false,
  onInkDocumentChange,
  allowUpscale = false,
  maxScale = 1.6,
  scaleMultiplier = 1,
  contentPaddingPx,
}: FlashcardProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [previewFlipped, setPreviewFlipped] = useState(false);

  const enableDrawMode = drawMode ?? false;
  const effectiveIsFlipped =
    isFlipped ?? (previewMode ? previewFlipped : false);
  const activeInkSide: "question" | "answer" = effectiveIsFlipped
    ? "answer"
    : "question";

  // previewMode 切り替え時に flip をリセット
  useEffect(() => {
    if (!previewMode) return;
    queueMicrotask(() => setPreviewFlipped(false));
  }, [previewMode, card?.id]);

  // ---------------------------------------------------------------------------
  // Derived data（active-side 含む）
  // ---------------------------------------------------------------------------
  const derived = useFlashcardDerived(card, effectiveIsFlipped);

  // ---------------------------------------------------------------------------
  // Ink hook
  // ---------------------------------------------------------------------------
  const ink = useFlashcardInk({
    cardId: derived.cardId,
    effectiveIsFlipped,
    inkEditingEnabled,
    previewMode: previewMode ?? false,
    contentRef,
    onInkDocumentChange,
  });

  // ---------------------------------------------------------------------------
  // Modal state
  // ---------------------------------------------------------------------------
  const media = useFlashcardMediaState();

  // ---------------------------------------------------------------------------
  // Flip handling
  // ---------------------------------------------------------------------------
  const isInkEditingActive = Boolean(
    previewMode && inkEditingEnabled && ink.previewInkTool,
  );

  const handleFlip = React.useCallback(
    (e?: React.MouseEvent) => {
      if (media.isModalBlockingFlip) return;
      if (isInkEditingActive) return;

      if (previewMode) {
        e?.stopPropagation();
        setPreviewFlipped((prev) => !prev);
        return;
      }

      if (onFlip) {
        e?.stopPropagation();
        onFlip();
      }
    },
    [media.isModalBlockingFlip, isInkEditingActive, previewMode, onFlip],
  );

  // ---------------------------------------------------------------------------
  // Corner actions
  // ---------------------------------------------------------------------------
  const { actionsTopLeft, actionsTopRight } = useFlashcardCornerControls({
    card: card ?? ({} as FlashcardCardLike),
    previewMode,
    hasUncertainty: derived.hasUncertainty,
    isBookmarked: derived.isBookmarked,
    activeImages: derived.activeImages,
    activeAudioUrls: derived.activeAudioUrls,
    activeReferences: derived.activeReferences,
    extraHeaderLeft,
    onEdit: card ? onEdit : undefined,
    onToggleUncertainty: card ? onToggleUncertainty : undefined,
    onToggleBookmark: card ? onToggleBookmark : undefined,
    onOpenImagePopup: () => media.setIsImagePopupOpen(true),
    onOpenAudioPopup: () => media.setIsAudioPopupOpen(true),
    onOpenReferencePopup: () => media.setIsReferencePopupOpen(true),
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!card) {
    return <div className="text-center py-12 text-gray-500">No Card Data</div>;
  }

  const fixedHeightPx = layoutRowsToCardHeightPx(derived.layoutRows);

  return (
    <div
      className={cn(
        "w-full flex flex-col select-none overflow-visible",
        className,
      )}
    >
      <div className="relative">
        <CardFrame
          baseWidth={CANONICAL_CARD_WIDTH}
          contentPaddingPx={contentPaddingPx ?? 0}
          allowUpscale={allowUpscale}
          maxScale={maxScale}
          scaleMultiplier={scaleMultiplier}
          className={cn(
            "premium-paper-depth",
            !previewMode && "cursor-pointer",
            "card-shell--paper",
          )}
          onClick={handleFlip}
          resizable={false}
          resizeStepPx={undefined}
          showResizeHandle={false}
          heightPx={fixedHeightPx}
          lockHeight
          actionsTopLeft={actionsTopLeft}
          actionsTopRight={actionsTopRight}
          drawMode={enableDrawMode}
          ruledPhasePx={0}
          overlay={
            <FlashcardInkOverlay
              extraHeaderRight={extraHeaderRight}
              extraFooter={extraFooter}
              previewMode={previewMode ?? false}
              inkEditingEnabled={inkEditingEnabled}
              cardId={derived.cardId}
              activeInkSide={activeInkSide}
              activeInkDocument={derived.activeInkDocument}
              layoutStable={ink.layoutStable}
              shouldMountInkLayer={ink.shouldMountInkLayer}
              previewInkRef={ink.previewInkRef}
              previewInkTool={ink.previewInkTool}
              previewInkHistory={ink.previewInkHistory}
              onInkDocumentChange={ink.handleInkDocumentChange}
              setPreviewInkTool={ink.setPreviewInkTool}
              setPreviewInkHistory={ink.setPreviewInkHistory}
            />
          }
        >
          <div
            ref={contentRef}
            className="animate-in fade-in zoom-in-95 duration-300 w-full max-w-full flex min-h-0 flex-1"
          >
            <SharedCardContent
              mode="view"
              blocks={derived.activeBlocks}
              onGalleryFullscreenChange={media.handleGalleryFullscreenChange}
            />
          </div>
        </CardFrame>
      </div>

      <FlashcardMediaDialogs
        isImagePopupOpen={media.isImagePopupOpen}
        setIsImagePopupOpen={media.setIsImagePopupOpen}
        isAudioPopupOpen={media.isAudioPopupOpen}
        setIsAudioPopupOpen={media.setIsAudioPopupOpen}
        isReferencePopupOpen={media.isReferencePopupOpen}
        setIsReferencePopupOpen={media.setIsReferencePopupOpen}
        activeImages={derived.activeImages}
        activeAudioUrls={derived.activeAudioUrls}
        activeReferences={derived.activeReferences}
      />

      {!previewMode && (
        <FlashcardNavigation
          onNext={onNext}
          onPrev={onPrev}
          hasNext={hasNext}
          hasPrev={hasPrev}
          currentIndex={currentIndex}
          totalCards={totalCards}
        />
      )}
    </div>
  );
}




