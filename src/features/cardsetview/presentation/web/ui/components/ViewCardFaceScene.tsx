import { FlashcardInkOverlay } from "@/components/card/frame/FlashcardInkOverlay";
import { FlashcardMediaDialogs } from "@/components/card/frame/FlashcardMediaDialogs";
import { useFlashcardCornerControls } from "@/components/card/frame/FlashcardCornerControls";
import type { FlashcardCardLike } from "@/components/card/frame/Flashcard";
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
  inkEditingEnabled: boolean;
  onFlip?: () => void;
  onToggleUncertainty?: (card: Card) => void | Promise<void>;
  onToggleBookmark?: (card: Card) => void | Promise<void>;
}>;

const TAP_MOVE_CANCEL_THRESHOLD_PX = 8;

const shouldIgnoreFlipTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return Boolean(
    element.closest(
      'button, a, input, textarea, select, label, [data-card-no-flip="true"]',
    ),
  );
};

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
  inkEditingEnabled,
  onFlip,
  onToggleUncertainty,
  onToggleBookmark,
}: ViewCardFaceSceneProps) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const flipSuppressedUntilRef = React.useRef(0);
  const suppressNextFlipRef = React.useRef(false);
  const pointerGestureRef = React.useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    moved: false,
  });

  const flashcardCard = React.useMemo<FlashcardCardLike>(
    () => toFlashcardCardLike(card),
    [card],
  );
  const effectiveIsFlipped = side === "answer";
  const derived = useFlashcardDerived(flashcardCard, effectiveIsFlipped);
  const media = useFlashcardMediaState();
  const ink = useFlashcardInk({
    cardId: derived.cardId,
    effectiveIsFlipped,
    showInkLayer,
    inkEditingEnabled,
    previewMode,
    contentRef,
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

  const resetPointerGesture = React.useCallback(() => {
    pointerGestureRef.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      moved: false,
    };
  }, []);

  const finishPointerGesture = React.useCallback(
    (pointerId: number | null) => {
      const state = pointerGestureRef.current;
      if (state.pointerId == null) return;
      if (pointerId != null && state.pointerId !== pointerId) return;
      if (state.moved) suppressNextFlipRef.current = true;
      resetPointerGesture();
    },
    [resetPointerGesture],
  );

  const isCardClickable = Boolean(!previewMode && onFlip);

  const handleFlip = React.useCallback(
    (event?: React.MouseEvent<HTMLDivElement>) => {
      if (!isCardClickable || !onFlip) return;
      if (suppressNextFlipRef.current) {
        suppressNextFlipRef.current = false;
        return;
      }
      if (Date.now() < flipSuppressedUntilRef.current) return;
      if (event && shouldIgnoreFlipTarget(event.target)) return;
      if (media.isModalBlockingFlip) return;
      if (inkEditingEnabled) return;

      event?.stopPropagation();
      onFlip();
    },
    [inkEditingEnabled, isCardClickable, media.isModalBlockingFlip, onFlip],
  );

  const handleKeyDown = React.useCallback<
    React.KeyboardEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (!isCardClickable) return;
      if (event.target !== event.currentTarget) return;
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      onFlip?.();
    },
    [isCardClickable, onFlip],
  );

  const overlay = (
    <FlashcardInkOverlay
      extraHeaderRight={undefined}
      extraFooter={undefined}
      previewMode={previewMode}
      showInkLayer={showInkLayer}
      inkEditingEnabled={inkEditingEnabled}
      cardId={derived.cardId}
      activeInkSide={effectiveIsFlipped ? "answer" : "question"}
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
          blocks: derived.activeBlocks,
          onGalleryFullscreenChange: media.handleGalleryFullscreenChange,
        }}
        actionsTopLeft={actionsTopLeft}
        actionsTopRight={actionsTopRight}
        overlay={overlay}
        frameClassName={isCardClickable ? "cursor-pointer" : undefined}
        role={isCardClickable ? "button" : undefined}
        tabIndex={isCardClickable ? 0 : undefined}
        onClick={isCardClickable ? handleFlip : undefined}
        onKeyDown={isCardClickable ? handleKeyDown : undefined}
        onPointerDownCapture={
          isCardClickable
            ? (event) => {
                if (shouldIgnoreFlipTarget(event.target)) {
                  resetPointerGesture();
                  return;
                }

                pointerGestureRef.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  moved: false,
                };
              }
            : undefined
        }
        onPointerMoveCapture={
          isCardClickable
            ? (event) => {
                const state = pointerGestureRef.current;
                if (state.pointerId !== event.pointerId) return;
                if (state.moved) return;

                const dx = Math.abs(event.clientX - state.startX);
                const dy = Math.abs(event.clientY - state.startY);

                if (
                  dx > TAP_MOVE_CANCEL_THRESHOLD_PX ||
                  dy > TAP_MOVE_CANCEL_THRESHOLD_PX
                ) {
                  state.moved = true;
                }
              }
            : undefined
        }
        onPointerUpCapture={
          isCardClickable
            ? (event) => {
                finishPointerGesture(event.pointerId);
              }
            : undefined
        }
        onPointerCancelCapture={
          isCardClickable
            ? (event) => {
                finishPointerGesture(event.pointerId);
              }
            : undefined
        }
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
