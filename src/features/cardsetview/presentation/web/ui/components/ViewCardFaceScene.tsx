import { FlashcardInkOverlay } from "@/components/card/frame/FlashcardInkOverlay";
import { FlashcardMediaDialogs } from "@/components/card/frame/FlashcardMediaDialogs";
import { useFlashcardCornerControls } from "@/components/card/frame/FlashcardCornerControls";
import type { FlashcardCardLike } from "@/components/card/frame/Flashcard";
import { useCardFlipBehavior } from "@/components/card/frame/useCardFlipBehavior";
import { useFlashcardDerived } from "@/components/card/frame/useFlashcardDerived";
import { useFlashcardInk } from "@/components/card/frame/useFlashcardInk";
import { useFlashcardMediaState } from "@/components/card/frame/useFlashcardMediaState";
import { CardFaceScene } from "@/features/cardsetview/presentation/web/ui/components/CardFaceScene";
import type { Card } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React from "react";

type Side = "question" | "answer";

export type ViewCardFaceSceneProps = Readonly<{
  card: Card;
  side: Side;
  displayMode: CardDisplayMode;
  fixedScale?: number;
  contentZoom: number;
  headerIconVisualScale: number;
  previewMode: boolean;
  showInkLayer: boolean;
  drawMode?: boolean;
  inkEditingEnabled: boolean;
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

export const ViewCardFaceScene = ({
  card,
  side,
  displayMode,
  fixedScale,
  contentZoom,
  headerIconVisualScale,
  previewMode,
  showInkLayer,
  drawMode = false,
  inkEditingEnabled,
  onFlip,
  onToggleUncertainty,
  onToggleBookmark,
}: ViewCardFaceSceneProps) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const flashcardCard = React.useMemo<FlashcardCardLike>(
    () => toFlashcardCardLike(card),
    [card],
  );
  const effectiveIsFlipped = side === "answer";
  const isFixedDisplay = displayMode !== "fluid";
  const allowInkEditing = Boolean(inkEditingEnabled && drawMode);
  const shouldShowInkLayer = Boolean(showInkLayer && isFixedDisplay);
  const shouldEnableInkEditing = Boolean(allowInkEditing && isFixedDisplay);

  const derived = useFlashcardDerived(flashcardCard, effectiveIsFlipped);
  const media = useFlashcardMediaState();
  const ink = useFlashcardInk({
    cardId: derived.cardId,
    effectiveIsFlipped,
    showInkLayer,
    inkEditingEnabled: allowInkEditing,
    previewMode,
    contentRef,
  });

  const isInkEditingActive = Boolean(allowInkEditing && ink.previewInkTool);

  const {
    handleFlip,
    handleKeyDown,
    handlePointerDownCapture,
    handlePointerMoveCapture,
    handlePointerUpCapture,
    handlePointerCancelCapture,
  } = useCardFlipBehavior({
    isCardClickable: Boolean(!previewMode && onFlip),
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
    hasUncertainty: derived.hasUncertainty,
    isBookmarked: derived.isBookmarked,
    activeImageItems: derived.activeImageItems,
    activeAudioUrls: derived.activeAudioUrls,
    activeReferences: derived.activeReferences,
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

  const overlay = (
    <FlashcardInkOverlay
      extraHeaderRight={undefined}
      extraFooter={undefined}
      previewMode={previewMode}
      showInkLayer={shouldShowInkLayer}
      inkEditingEnabled={shouldEnableInkEditing}
      cardId={derived.cardId}
      activeInkSide={effectiveIsFlipped ? "answer" : "question"}
      activeInkDocument={derived.activeInkDocument}
      layoutStable={ink.layoutStable}
      shouldMountInkLayer={Boolean(ink.shouldMountInkLayer && isFixedDisplay)}
      previewInkRef={ink.previewInkRef}
      previewInkTool={ink.previewInkTool}
      previewInkHistory={ink.previewInkHistory}
      onInkDocumentChange={ink.handleInkDocumentChange}
      setPreviewInkTool={ink.setPreviewInkTool}
      setPreviewInkHistory={ink.setPreviewInkHistory}
    />
  );

  const isCardClickable = Boolean(!previewMode && onFlip);

  return (
    <>
      <CardFaceScene
        displayMode={displayMode}
        fixedScale={fixedScale}
        contentZoom={contentZoom}
        contentWrapperRef={contentRef}
        contentProps={{
          mode: "view",
          blocks: derived.activeBlocks,
          onGalleryFullscreenChange: media.handleGalleryFullscreenChange,
        }}
        actionsTopLeft={actionsTopLeft}
        actionsTopRight={actionsTopRight}
        overlay={overlay}
        frameClassName={isCardClickable ? "cursor-pointer" : undefined}
        role={isCardClickable ? "button" : undefined}
        tabIndex={isCardClickable ? 0 : undefined}
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerMoveCapture={handlePointerMoveCapture}
        onPointerUpCapture={handlePointerUpCapture}
        onPointerCancelCapture={handlePointerCancelCapture}
      />

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
    </>
  );
};
