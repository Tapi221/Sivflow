import React from "react";
import { FlashcardMediaDialogs } from "@web-renderer/chip/panel/dialog.desktop/Dialog.FlashcardMedia";
import type { FlashcardCardLike } from "@/components/card/frame/Flashcard";
import type { FlashcardSharedDerivedSnapshot, FlashcardSideDerivedSnapshot } from "@/components/card/frame/flashcard.types";
import { useFlashcardCornerControls } from "@/components/card/frame/FlashcardCornerControls";
import { FlashcardInkOverlay } from "@/components/card/frame/FlashcardInkOverlay";
import { useCardFlipBehavior } from "@/components/card/frame/useCardFlipBehavior";
import { useFlashcardInk } from "@/components/card/frame/useFlashcardInk";
import { useFlashcardMediaState } from "@/components/card/frame/useFlashcardMediaState";
import { CardFaceScene } from "./CardFaceScene";
import type { Card } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";



type PreparedViewCardFaceSceneProps = Readonly<{ card: Card;
  sharedDerived: FlashcardSharedDerivedSnapshot;
  sideDerived: FlashcardSideDerivedSnapshot;
  displayMode: CardDisplayMode;
  fixedScale?: number;
  fixedHeightPx?: number | null;
  contentZoom: number;
  headerIconVisualScale: number;
  previewMode: boolean;
  showInkLayer: boolean;
  drawMode?: boolean;
  inkEditingEnabled: boolean;
  fillHeight?: boolean;
  onFlip?: () => void;
  onToggleUncertainty?: (card: Card) => void | Promise<void>;
  onToggleBookmark?: (card: Card) => void | Promise<void>;
}>;



const toFlashcardCardLike = (card: Card): FlashcardCardLike => ({
  id: card.id,
  cardId: card.cardId,
  hasUncertainty: card.hasUncertainty,
  has_uncertainty: card.hasUncertainty,
  isBookmarked: card.isBookmarked ?? false,
  is_bookmarked: card.isBookmarked ?? false,
  front: card.front,
  back: card.back,
  layoutRows: card.layoutRows,
  inkQuestion: card.front.ink ?? null,
  inkAnswer: card.back.ink ?? null,
});



const PreparedViewCardFaceScene = ({ card, sharedDerived, sideDerived, displayMode, fixedScale, fixedHeightPx = null, contentZoom, headerIconVisualScale, previewMode, showInkLayer, drawMode = false, inkEditingEnabled, fillHeight = false, onFlip, onToggleUncertainty, onToggleBookmark }: PreparedViewCardFaceSceneProps) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const flashcardCard = React.useMemo<FlashcardCardLike>(
    () => toFlashcardCardLike(card),
    [card],
  );
  const effectiveIsFlipped = sideDerived.activeSide === "answer";
  const isFixedDisplay = displayMode !== "fluid";
  const allowInkEditing = Boolean(inkEditingEnabled && drawMode);
  const shouldShowInkLayer = Boolean(showInkLayer && isFixedDisplay);
  const shouldEnableInkEditing = Boolean(allowInkEditing && isFixedDisplay);
  const resolvedFixedHeightPx =
    isFixedDisplay &&
      typeof fixedHeightPx === "number" &&
      Number.isFinite(fixedHeightPx) &&
      fixedHeightPx > 0
      ? fixedHeightPx
      : null;

  const media = useFlashcardMediaState();
  const ink = useFlashcardInk({
    cardId: sharedDerived.cardId,
    effectiveIsFlipped,
    showInkLayer,
    inkEditingEnabled: allowInkEditing,
    previewMode,
    contentRef,
  });

  const isInkEditingActive = Boolean(allowInkEditing && ink.previewInkTool);
  const isCardClickable = Boolean(!previewMode && onFlip);
  const shouldBindFlipHandlers = previewMode || isCardClickable;

  const {
    handleFlip,
    handleKeyDown,
    handlePointerDownCapture,
    handlePointerMoveCapture,
    handlePointerUpCapture,
    handlePointerCancelCapture,
  } = useCardFlipBehavior({
    isCardClickable,
    previewMode,
    onFlip,
    isModalBlockingFlip: media.isModalBlockingFlip,
    isInkEditingActive,
  });

  const handleToggleUncertaintyInternal = React.useCallback(() => {
    if (!onToggleUncertainty) return;
    void onToggleUncertainty(card);
  }, [card, onToggleUncertainty]);

  const handleToggleBookmarkInternal = React.useCallback(() => {
    if (!onToggleBookmark) return;
    void onToggleBookmark(card);
  }, [card, onToggleBookmark]);

  const { actionsTopLeft, actionsTopRight } = useFlashcardCornerControls({
    card: flashcardCard,
    hasUncertainty: sharedDerived.hasUncertainty,
    isBookmarked: sharedDerived.isBookmarked,
    activeImageItems: sideDerived.activeImageItems,
    activeAudioUrls: sideDerived.activeAudioUrls,
    activeReferences: sideDerived.activeReferences,
    extraHeaderLeft: undefined,
    onToggleUncertainty: onToggleUncertainty
      ? () => {
        handleToggleUncertaintyInternal();
      }
      : undefined,
    onToggleBookmark: onToggleBookmark
      ? () => {
        handleToggleBookmarkInternal();
      }
      : undefined,
    onOpenImagePopup: () => media.setIsImagePopupOpen(true),
    onOpenAudioPopup: () => media.setIsAudioPopupOpen(true),
    onOpenReferencePopup: () => media.setIsReferencePopupOpen(true),
    headerIconVisualScale,
  });

  const overlay = React.useMemo(
    () => (
      <FlashcardInkOverlay
        extraHeaderRight={undefined}
        extraFooter={undefined}
        previewMode={previewMode}
        showInkLayer={shouldShowInkLayer}
        inkEditingEnabled={shouldEnableInkEditing}
        cardId={sharedDerived.cardId}
        activeInkSide={effectiveIsFlipped ? "answer" : "question"}
        activeInkDocument={sideDerived.activeInkDocument}
        layoutStable={ink.layoutStable}
        shouldMountInkLayer={Boolean(ink.shouldMountInkLayer && isFixedDisplay)}
        previewInkRef={ink.previewInkRef}
        previewInkTool={ink.previewInkTool}
        previewInkHistory={ink.previewInkHistory}
        onInkDocumentChange={ink.handleInkDocumentChange}
        setPreviewInkTool={ink.setPreviewInkTool}
        setPreviewInkHistory={ink.setPreviewInkHistory}
      />
    ),
    [
      effectiveIsFlipped,
      ink.handleInkDocumentChange,
      ink.layoutStable,
      ink.previewInkHistory,
      ink.previewInkRef,
      ink.previewInkTool,
      ink.setPreviewInkHistory,
      ink.setPreviewInkTool,
      ink.shouldMountInkLayer,
      isFixedDisplay,
      previewMode,
      sharedDerived.cardId,
      shouldEnableInkEditing,
      shouldShowInkLayer,
      sideDerived.activeInkDocument,
    ],
  );

  return (
    <>
      <CardFaceScene
        displayMode={displayMode}
        fixedScale={fixedScale}
        contentZoom={contentZoom}
        contentWrapperRef={contentRef}
        contentProps={{
          mode: "view",
          blocks: sideDerived.activeBlocks,
          onGalleryFullscreenChange: media.handleGalleryFullscreenChange,
        }}
        actionsTopLeft={actionsTopLeft}
        actionsTopRight={actionsTopRight}
        overlay={overlay}
        frameClassName={isCardClickable ? "cursor-pointer" : undefined}
        role={isCardClickable ? "button" : undefined}
        tabIndex={isCardClickable ? 0 : undefined}
        heightPx={resolvedFixedHeightPx}
        lockHeight={resolvedFixedHeightPx !== null}
        fillHeight={fillHeight}
        onClick={shouldBindFlipHandlers ? handleFlip : undefined}
        onKeyDown={shouldBindFlipHandlers ? handleKeyDown : undefined}
        onPointerDownCapture={
          shouldBindFlipHandlers ? handlePointerDownCapture : undefined
        }
        onPointerMoveCapture={
          shouldBindFlipHandlers ? handlePointerMoveCapture : undefined
        }
        onPointerUpCapture={
          shouldBindFlipHandlers ? handlePointerUpCapture : undefined
        }
        onPointerCancelCapture={
          shouldBindFlipHandlers ? handlePointerCancelCapture : undefined
        }
      />
      <FlashcardMediaDialogs
        isImagePopupOpen={media.isImagePopupOpen}
        setIsImagePopupOpen={media.setIsImagePopupOpen}
        isAudioPopupOpen={media.isAudioPopupOpen}
        setIsAudioPopupOpen={media.setIsAudioPopupOpen}
        isReferencePopupOpen={media.isReferencePopupOpen}
        setIsReferencePopupOpen={media.setIsReferencePopupOpen}
        activeImageItems={sideDerived.activeImageItems}
        activeImages={sideDerived.activeImages}
        activeAudioUrls={sideDerived.activeAudioUrls}
        activeReferences={sideDerived.activeReferences}
      />
    </>
  );
};



export { PreparedViewCardFaceScene };


export type { PreparedViewCardFaceSceneProps };
