import { layoutRowsToCardHeightPx } from "@constants/shared/flashcard";
import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { buildSharedCardSurfaceMetrics } from "@/features/cardsetview/presentation/web/ui/components/cardSurfacePresentation";
import { CardSurfaceLayout } from "@/features/cardsetview/presentation/web/ui/components/CardSurfaceLayout";
import { DesktopEmbeddedCardEditorSurface } from "@/features/cardsetview/presentation/web/ui/components/DesktopEmbeddedCardEditorSurface";
import { ViewCardFaceScene } from "@/features/cardsetview/presentation/web/ui/components/ViewCardFaceScene";
import type { Card, UserSettings } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React from "react";

export interface DesktopCardSurfaceProps {
  card: Card;
  isActive: boolean;
  isGlobalEditing: boolean;
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

const DesktopCardSurfaceInner = ({
  card,
  isActive,
  isGlobalEditing,
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

  const metrics = React.useMemo(
    () =>
      buildSharedCardSurfaceMetrics({
        displayMode: currentDisplayMode,
        cardLayoutMode: currentCardLayoutMode,
        zoomScale: viewZoomScale,
      }),
    [currentCardLayoutMode, currentDisplayMode, viewZoomScale],
  );

  const fixedHeightPx = React.useMemo<number | null>(() => {
    if (currentDisplayMode !== "fixed") return null;
    return layoutRowsToCardHeightPx(card.layoutRows);
  }, [card.layoutRows, currentDisplayMode]);

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

  const questionNode = (
    <div data-card-face="question" className="min-w-0">
      <ViewCardFaceScene
        card={card}
        side="question"
        displayMode={currentDisplayMode}
        fixedScale={metrics.sideFixedScale}
        fixedHeightPx={fixedHeightPx}
        contentZoom={metrics.sideContentZoom}
        headerIconVisualScale={metrics.sideHeaderIconVisualScale}
        previewMode={true}
        showInkLayer={currentDisplayMode === "fixed"}
        drawMode={false}
        inkEditingEnabled={false}
      />
    </div>
  );

  const answerNode = (
    <div data-card-face="answer" className="min-w-0">
      <ViewCardFaceScene
        card={card}
        side="answer"
        displayMode={currentDisplayMode}
        fixedScale={metrics.sideFixedScale}
        fixedHeightPx={fixedHeightPx}
        contentZoom={metrics.sideContentZoom}
        headerIconVisualScale={metrics.sideHeaderIconVisualScale}
        previewMode={true}
        showInkLayer={currentDisplayMode === "fixed"}
        drawMode={false}
        inkEditingEnabled={false}
      />
    </div>
  );

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
          questionNode={questionNode}
          answerNode={answerNode}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-visible">
      <div data-card-face={isFlipped ? "answer" : "question"} className="min-w-0">
        <ViewCardFaceScene
          card={card}
          side={isFlipped ? "answer" : "question"}
          displayMode={currentDisplayMode}
          fixedScale={metrics.baseFixedScale}
          fixedHeightPx={fixedHeightPx}
          contentZoom={metrics.baseContentZoom}
          headerIconVisualScale={metrics.baseHeaderIconVisualScale}
          previewMode={!isActive}
          showInkLayer={metrics.renderSpec.showInk}
          drawMode={false}
          inkEditingEnabled={metrics.renderSpec.showInk && isActive}
          onFlip={isActive ? onFlip : undefined}
          onToggleUncertainty={isActive ? onToggleUncertainty : undefined}
          onToggleBookmark={isActive ? onToggleBookmark : undefined}
        />
      </div>
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
