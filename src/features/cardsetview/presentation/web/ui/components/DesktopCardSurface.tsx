import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import {
  Flashcard,
  type FlashcardCardLike,
} from "@/components/card/frame/Flashcard";
import { CardSurfaceLayout } from "@/features/cardsetview/presentation/web/ui/components/CardSurfaceLayout";
import { DesktopEmbeddedCardEditorSurface } from "@/features/cardsetview/presentation/web/ui/components/DesktopEmbeddedCardEditorSurface";
import { buildSharedCardSurfaceMetrics } from "@/features/cardsetview/presentation/web/ui/components/cardSurfacePresentation";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import type { Card, UserSettings } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React from "react";

export interface DesktopCardSurfaceProps {
  card: Card;
  isActive: boolean;
  isGlobalEditing: boolean;
  editPaneWidthPx: number;
  settings?: Partial<UserSettings> | null;
  isFlipped: boolean;
  currentDisplayMode: CardDisplayMode;
  currentCardLayoutMode: CardLayoutMode;
  viewZoomScale: number;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride?: Card[];
  onFlip: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
  onSyncStatusChange: (status: CardSyncStatus | null) => void;
}

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

const StaticCardSide = ({
  card,
  currentDisplayMode,
  fixedScale,
  contentZoom,
  headerIconVisualScale,
  side,
}: {
  card: Card;
  currentDisplayMode: CardDisplayMode;
  fixedScale?: number;
  contentZoom: number;
  headerIconVisualScale: number;
  side: "question" | "answer";
}) => {
  const flashcardCard = React.useMemo(() => toFlashcardCardLike(card), [card]);

  return (
    <Flashcard
      card={flashcardCard}
      isFlipped={side === "answer"}
      previewMode={true}
      displayMode={currentDisplayMode}
      showInkLayer={currentDisplayMode === "fixed"}
      allowUpscale={false}
      scaleMultiplier={1}
      fixedScale={fixedScale}
      contentZoom={contentZoom}
      headerIconVisualScale={headerIconVisualScale}
      cardShellClassName={
        currentDisplayMode === "fluid"
          ? "border-none bg-transparent shadow-none"
          : undefined
      }
    />
  );
};

const DesktopCardSurfaceInner = ({
  card,
  isActive,
  isGlobalEditing,
  editPaneWidthPx,
  settings = null,
  isFlipped,
  currentDisplayMode,
  currentCardLayoutMode,
  viewZoomScale,
  folderId,
  cardSetId,
  cardsOverride,
  onFlip,
  onToggleUncertainty,
  onToggleBookmark,
  onSyncStatusChange,
}: DesktopCardSurfaceProps) => {
  const [hasFocusWithin, setHasFocusWithin] = React.useState(false);

  const flashcardCard = React.useMemo(() => {
    return toFlashcardCardLike(card);
  }, [card]);

  const metrics = React.useMemo(
    () =>
      buildSharedCardSurfaceMetrics({
        displayMode: currentDisplayMode,
        cardLayoutMode: currentCardLayoutMode,
        zoomScale: viewZoomScale,
      }),
    [currentCardLayoutMode, currentDisplayMode, viewZoomScale],
  );

  const handleEditorFocusCapture = React.useCallback(() => {
    setHasFocusWithin(true);
  }, []);

  const handleEditorBlurCapture = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const nextFocused = event.relatedTarget as Node | null;
      if (!nextFocused || !event.currentTarget.contains(nextFocused)) {
        setHasFocusWithin(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (isGlobalEditing) return;
    setHasFocusWithin(false);
  }, [isGlobalEditing]);

  const canInteractWithEditor = isGlobalEditing && (isActive || hasFocusWithin);

  if (isGlobalEditing) {
    return (
      <div
        className="w-full min-w-0 overflow-visible"
        onFocusCapture={handleEditorFocusCapture}
        onBlurCapture={handleEditorBlurCapture}
        style={
          !isActive && !hasFocusWithin
            ? { pointerEvents: "none", userSelect: "none" }
            : undefined
        }
      >
        <DesktopEmbeddedCardEditorSurface
          selectedCardId={card.id}
          folderId={folderId}
          cardSetId={cardSetId}
          cardsOverride={cardsOverride}
          settings={settings}
          displayMode={currentDisplayMode}
          cardLayoutMode={currentCardLayoutMode}
          zoomScale={viewZoomScale}
          isInteractive={canInteractWithEditor}
          onSyncStatusChange={onSyncStatusChange}
        />
      </div>
    );
  }

  if (currentCardLayoutMode !== "flip") {
    return (
      <div className="w-full min-w-0 max-w-full overflow-visible">
        <CardSurfaceLayout
          cardLayoutMode={currentCardLayoutMode}
          questionNode={
            <StaticCardSide
              card={card}
              currentDisplayMode={currentDisplayMode}
              fixedScale={metrics.sideFixedScale}
              contentZoom={metrics.sideContentZoom}
              headerIconVisualScale={metrics.sideHeaderIconVisualScale}
              side="question"
            />
          }
          answerNode={
            <StaticCardSide
              card={card}
              currentDisplayMode={currentDisplayMode}
              fixedScale={metrics.sideFixedScale}
              contentZoom={metrics.sideContentZoom}
              headerIconVisualScale={metrics.sideHeaderIconVisualScale}
              side="answer"
            />
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-visible">
      <Flashcard
        card={flashcardCard}
        isFlipped={isFlipped}
        previewMode={!isActive}
        displayMode={currentDisplayMode}
        showInkLayer={metrics.renderSpec.showInk}
        inkEditingEnabled={metrics.renderSpec.showInk && isActive}
        onFlip={isActive ? onFlip : undefined}
        onToggleUncertainty={
          isActive
            ? () => {
                void onToggleUncertainty(card);
              }
            : undefined
        }
        onToggleBookmark={
          isActive
            ? () => {
                void onToggleBookmark(card);
              }
            : undefined
        }
        allowUpscale={false}
        scaleMultiplier={1}
        fixedScale={metrics.baseFixedScale}
        contentZoom={metrics.baseContentZoom}
        headerIconVisualScale={metrics.baseHeaderIconVisualScale}
        cardShellClassName={
          currentDisplayMode === "fluid"
            ? "border-none bg-transparent shadow-none"
            : undefined
        }
      />
    </div>
  );
};

const areDesktopCardSurfacePropsEqual = (
  prev: DesktopCardSurfaceProps,
  next: DesktopCardSurfaceProps,
) => {
  if (prev.card !== next.card) return false;
  if (prev.isActive !== next.isActive) return false;
  if (prev.isGlobalEditing !== next.isGlobalEditing) return false;
  if (prev.editPaneWidthPx !== next.editPaneWidthPx) return false;
  if (prev.settings !== next.settings) return false;
  if (prev.currentDisplayMode !== next.currentDisplayMode) return false;
  if (prev.currentCardLayoutMode !== next.currentCardLayoutMode) return false;
  if (prev.viewZoomScale !== next.viewZoomScale) return false;
  if (prev.folderId !== next.folderId) return false;
  if (prev.cardSetId !== next.cardSetId) return false;
  if (prev.onFlip !== next.onFlip) return false;
  if (prev.onToggleUncertainty !== next.onToggleUncertainty) return false;
  if (prev.onToggleBookmark !== next.onToggleBookmark) return false;
  if (prev.onSyncStatusChange !== next.onSyncStatusChange) return false;

  if (next.isGlobalEditing && prev.cardsOverride !== next.cardsOverride) {
    return false;
  }

  const prevNeedsFlip =
    !prev.isGlobalEditing &&
    prev.isActive &&
    prev.currentCardLayoutMode === "flip";
  const nextNeedsFlip =
    !next.isGlobalEditing &&
    next.isActive &&
    next.currentCardLayoutMode === "flip";

  if (prevNeedsFlip !== nextNeedsFlip) return false;
  if (nextNeedsFlip && prev.isFlipped !== next.isFlipped) return false;

  return true;
};

export const DesktopCardSurface = React.memo(
  DesktopCardSurfaceInner,
  areDesktopCardSurfacePropsEqual,
);

DesktopCardSurface.displayName = "DesktopCardSurface";
