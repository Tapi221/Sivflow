import React, { useEffect, useRef, useState } from "react";
import type { InkDocument } from "@core/domain/card/ink/inkDocument";
import { FlashcardMediaDialogs } from "@web-renderer/chip/panel/dialog.desktop/Dialog.FlashcardMedia";
import { cn } from "@web-renderer/lib/utils";
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import { CardFrame } from "./CardFrame";
import { CARD_SHELL_COMMON_CLASS_NAME } from "./cardShellClassNames";
import type { FlashcardCardLike } from "./flashcard.types";
import { useFlashcardCornerControls } from "./FlashcardCornerControls";
import { FlashcardInkOverlay } from "./FlashcardInkOverlay";
import { FlashcardNavigation } from "./FlashcardNavigation";
import { useCardFlipBehavior } from "./useCardFlipBehavior";
import { useFlashcardDerived } from "./useFlashcardDerived";
import { useFlashcardInk } from "./useFlashcardInk";
import { useFlashcardMediaState } from "./useFlashcardMediaState";
import { CANONICAL_CARD_WIDTH, CARD_DISPLAY_SCALE, layoutRowsToCardHeightPx } from "@/domain/card/cardGeometry.constants";
import type { CardDisplayMode } from "@/types/domain/cardSet";



interface FlashcardProps {
  card: FlashcardCardLike | null | undefined;
  isFlipped?: boolean;
  onFlip?: () => void;
  onToggleUncertainty?: (card: FlashcardCardLike) => void;
  onToggleBookmark?: (card: FlashcardCardLike) => void;
  onEdit?: (card: FlashcardCardLike) => void;
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
  displayMode?: CardDisplayMode;
  showInkLayer?: boolean;
  drawMode?: boolean;
  inkEditingEnabled?: boolean;
  onInkDocumentChange?: (
    side: "question" | "answer",
    nextDocument: InkDocument,
  ) => void;
  allowUpscale?: boolean;
  maxScale?: number;
  scaleMultiplier?: number;
  fixedScale?: number;
  contentPaddingPx?: number;
  cardShellClassName?: string;
  contentZoom?: number;
  headerIconVisualScale?: number;
}



const areFlashcardPropsEqual = (prev: FlashcardProps, next: FlashcardProps) => {
  if (prev.card !== next.card) return false;
  if (prev.previewMode !== next.previewMode) return false;
  const previewOnly = Boolean(prev.previewMode && next.previewMode);
  if (previewOnly) {
    return (
      prev.isFlipped === next.isFlipped &&
      prev.className === next.className &&
      prev.displayMode === next.displayMode &&
      prev.showInkLayer === next.showInkLayer &&
      prev.drawMode === next.drawMode &&
      prev.inkEditingEnabled === next.inkEditingEnabled &&
      prev.allowUpscale === next.allowUpscale &&
      prev.maxScale === next.maxScale &&
      prev.scaleMultiplier === next.scaleMultiplier &&
      prev.fixedScale === next.fixedScale &&
      prev.contentPaddingPx === next.contentPaddingPx &&
      prev.cardShellClassName === next.cardShellClassName &&
      prev.contentZoom === next.contentZoom &&
      prev.headerIconVisualScale === next.headerIconVisualScale
    );
  }
  return (
    prev.isFlipped === next.isFlipped &&
    prev.onFlip === next.onFlip &&
    prev.onToggleUncertainty === next.onToggleUncertainty &&
    prev.onToggleBookmark === next.onToggleBookmark &&
    prev.onEdit === next.onEdit &&
    prev.className === next.className &&
    prev.onNext === next.onNext &&
    prev.onPrev === next.onPrev &&
    prev.hasNext === next.hasNext &&
    prev.hasPrev === next.hasPrev &&
    prev.currentIndex === next.currentIndex &&
    prev.totalCards === next.totalCards &&
    prev.extraHeaderLeft === next.extraHeaderLeft &&
    prev.extraHeaderRight === next.extraHeaderRight &&
    prev.extraFooter === next.extraFooter &&
    prev.displayMode === next.displayMode &&
    prev.showInkLayer === next.showInkLayer &&
    prev.drawMode === next.drawMode &&
    prev.inkEditingEnabled === next.inkEditingEnabled &&
    prev.onInkDocumentChange === next.onInkDocumentChange &&
    prev.allowUpscale === next.allowUpscale &&
    prev.maxScale === next.maxScale &&
    prev.scaleMultiplier === next.scaleMultiplier &&
    prev.fixedScale === next.fixedScale &&
    prev.contentPaddingPx === next.contentPaddingPx &&
    prev.cardShellClassName === next.cardShellClassName &&
    prev.contentZoom === next.contentZoom &&
    prev.headerIconVisualScale === next.headerIconVisualScale
  );
};



const FlashcardInner = ({
  card,
  isFlipped,
  onFlip,
  onToggleUncertainty,
  onToggleBookmark,
  onEdit: _onEdit,
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
  displayMode = "fixed",
  showInkLayer = false,
  drawMode,
  inkEditingEnabled = false,
  onInkDocumentChange,
  allowUpscale = false,
  maxScale = 1.6,
  scaleMultiplier = CARD_DISPLAY_SCALE,
  fixedScale,
  contentPaddingPx,
  cardShellClassName,
  contentZoom = 1,
  headerIconVisualScale = 1,
}: FlashcardProps) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const enableDrawMode = drawMode ?? false;
  const isFixedDisplay = displayMode !== "fluid";
  const allowInkEditing = Boolean(inkEditingEnabled && enableDrawMode);
  const effectiveIsFlipped =
    isFlipped ?? (previewMode ? previewFlipped : false);
  const activeInkSide: "question" | "answer" = effectiveIsFlipped
    ? "answer"
    : "question";
  const shouldShowInkLayer = Boolean(showInkLayer && isFixedDisplay);
  const shouldEnableInkEditing = Boolean(allowInkEditing && isFixedDisplay);
  useEffect(() => {
    if (!previewMode) return;
    queueMicrotask(() => setPreviewFlipped(false));
  }, [previewMode, card?.id]);
  const derived = useFlashcardDerived(card, effectiveIsFlipped);
  const ink = useFlashcardInk({
    cardId: derived.cardId,
    effectiveIsFlipped,
    showInkLayer,
    inkEditingEnabled: allowInkEditing,
    previewMode: previewMode ?? false,
    contentRef,
    onInkDocumentChange,
  });
  const media = useFlashcardMediaState();
  const isInkEditingActive = Boolean(allowInkEditing && ink.previewInkTool);
  const {
    handleFlip,
    handleKeyDown,
    handlePointerDownCapture,
    handlePointerMoveCapture,
    handlePointerUpCapture,
    handlePointerCancelCapture,
  } = useCardFlipBehavior({
    isCardClickable: !previewMode,
    previewMode: Boolean(previewMode),
    onFlip,
    onPreviewFlip: previewMode
      ? () => {
        setPreviewFlipped((prev) => !prev);
      }
      : undefined,
    isModalBlockingFlip: media.isModalBlockingFlip,
    isInkEditingActive,
  });
  const { actionsTopLeft, actionsTopRight } = useFlashcardCornerControls({
    card: card ?? ({} as FlashcardCardLike),
    hasUncertainty: derived.hasUncertainty,
    isBookmarked: derived.isBookmarked,
    activeImageItems: derived.activeImageItems,
    activeAudioUrls: derived.activeAudioUrls,
    activeReferences: derived.activeReferences,
    extraHeaderLeft,
    onToggleUncertainty: card ? onToggleUncertainty : undefined,
    onToggleBookmark: card ? onToggleBookmark : undefined,
    onOpenImagePopup: () => media.setIsImagePopupOpen(true),
    onOpenAudioPopup: () => media.setIsAudioPopupOpen(true),
    onOpenReferencePopup: () => media.setIsReferencePopupOpen(true),
    headerIconVisualScale,
  });
  if (!card) {
    return <div className="py-12 text-center text-gray-500">No Card Data</div>;
  }
  const fixedHeightPx = layoutRowsToCardHeightPx(derived.layoutRows);
  const isCardClickable = !previewMode;
  const resolvedContentZoom =
    typeof contentZoom === "number" &&
      Number.isFinite(contentZoom) &&
      contentZoom > 0
      ? contentZoom
      : 1;
  const contentNode = (
    <div
      ref={contentRef}
      className={cn(
        "w-full min-w-0 max-w-full",
        isFixedDisplay ? "flex min-h-0 flex-1" : "min-h-0",
      )}
    >
      <SharedCardContent
        mode="view"
        blocks={derived.activeBlocks}
        onGalleryFullscreenChange={media.handleGalleryFullscreenChange}
        displayMode={displayMode}
        zoom={isFixedDisplay ? 1 : resolvedContentZoom}
      />
    </div>
  );
  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col select-none overflow-visible",
        className,
      )}
    >
      <div className="relative min-w-0 max-w-full">
        <CardFrame
          baseWidth={CANONICAL_CARD_WIDTH}
          contentPaddingPx={contentPaddingPx ?? 0}
          allowUpscale={allowUpscale}
          maxScale={maxScale}
          scaleMultiplier={scaleMultiplier}
          fixedScale={fixedScale}
          disableScale={!isFixedDisplay}
          stretchWidth={!isFixedDisplay}
          ruled={isFixedDisplay}
          role={isCardClickable ? "button" : undefined}
          tabIndex={isCardClickable ? 0 : undefined}
          className={cn(
            CARD_SHELL_COMMON_CLASS_NAME,
            cardShellClassName,
            isCardClickable && "cursor-pointer",
            !isFixedDisplay &&
            "rounded-none md:rounded-none border-none bg-transparent shadow-none",
          )}
          onPointerDownCapture={handlePointerDownCapture}
          onPointerMoveCapture={handlePointerMoveCapture}
          onPointerUpCapture={handlePointerUpCapture}
          onPointerCancelCapture={handlePointerCancelCapture}
          onClick={handleFlip}
          onKeyDown={handleKeyDown}
          resizable={false}
          resizeStepPx={undefined}
          showResizeHandle={false}
          heightPx={isFixedDisplay ? fixedHeightPx : null}
          lockHeight={isFixedDisplay}
          actionsTopLeft={actionsTopLeft}
          actionsTopRight={actionsTopRight}
          drawMode={isFixedDisplay ? enableDrawMode : false}
          ruledPhasePx={0}
          overlay={
            <FlashcardInkOverlay
              extraHeaderRight={extraHeaderRight}
              extraFooter={extraFooter}
              previewMode={previewMode ?? false}
              showInkLayer={shouldShowInkLayer}
              inkEditingEnabled={shouldEnableInkEditing}
              cardId={derived.cardId}
              activeInkSide={activeInkSide}
              activeInkDocument={derived.activeInkDocument}
              layoutStable={ink.layoutStable}
              shouldMountInkLayer={Boolean(
                ink.shouldMountInkLayer && isFixedDisplay,
              )}
              previewInkRef={ink.previewInkRef}
              previewInkTool={ink.previewInkTool}
              previewInkHistory={ink.previewInkHistory}
              onInkDocumentChange={ink.handleInkDocumentChange}
              setPreviewInkTool={ink.setPreviewInkTool}
              setPreviewInkHistory={ink.setPreviewInkHistory}
            />
          }
        >
          {contentNode}
        </CardFrame>
      </div>
      <FlashcardMediaDialogs
        isImagePopupOpen={media.isImagePopupOpen}
        setIsImagePopupOpen={media.setIsImagePopupOpen}
        isAudioPopupOpen={media.isAudioPopupOpen}
        setIsAudioPopupOpen={media.setIsAudioPopupOpen}
        isReferencePopupOpen={media.isReferencePopupOpen}
        setIsReferencePopupOpen={media.setIsReferencePopupOpen}
        activeImageItems={derived.activeImageItems}
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
};



const Flashcard = React.memo(FlashcardInner, areFlashcardPropsEqual);
Flashcard.displayName = "Flashcard";

export { Flashcard };


export type { FlashcardCardLike };
