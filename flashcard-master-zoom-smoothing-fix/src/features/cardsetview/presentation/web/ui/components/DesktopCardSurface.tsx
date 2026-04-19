import { layoutRowsToCardHeightPx } from "@constants/shared/flashcard";
import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import { useFlashcardDualDerived } from "@/components/card/frame/useFlashcardDualDerived";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { buildCardSurfaceMetrics } from "@/features/cardsetview/presentation/web/ui/components/cardSurfacePresentation";
import { CardSurfaceLayout } from "@/features/cardsetview/presentation/web/ui/components/CardSurfaceLayout";
import { PreparedViewCardFaceScene } from "@/features/cardsetview/presentation/web/ui/components/PreparedViewCardFaceScene";
import { DesktopEmbeddedCardEditorSurface } from "@/features/cardsetview/presentation/web/ui/components/DesktopEmbeddedCardEditorSurface";
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
  previewScaleFactor?: number;
  isZoomPreviewActive?: boolean;
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
  previewScaleFactor = 1,
  isZoomPreviewActive = false,
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
      buildCardSurfaceMetrics({
        displayMode: currentDisplayMode,
        cardLayoutMode: currentCardLayoutMode,
        interactionMode: "view",
        zoomScale: viewZoomScale,
        fitScale: 1,
        showInk: currentDisplayMode === "fixed",
      }),
    [currentCardLayoutMode, currentDisplayMode, viewZoomScale],
  );

  const dualDerived = useFlashcardDualDerived(card);

  const fixedHeightPx = React.useMemo<number | null>(() => {
    if (currentDisplayMode !== "fixed") return null;
    return layoutRowsToCardHeightPx(dualDerived.layoutRows);
  }, [currentDisplayMode, dualDerived.layoutRows]);

  const shouldFillFaceHeight =
    currentDisplayMode === "fluid" && currentCardLayoutMode === "split";

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

  const zoomPreviewStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    if (!isActive || isGlobalEditing || !isZoomPreviewActive) {
      return undefined;
    }

    if (
      !Number.isFinite(previewScaleFactor) ||
      previewScaleFactor <= 0 ||
      Math.abs(previewScaleFactor - 1) < 0.0005
    ) {
      return undefined;
    }

    return {
      transform: `scale(${previewScaleFactor})`,
      transformOrigin: "top center",
      willChange: "transform",
      position: "relative",
      zIndex: 1,
    };
  }, [isActive, isGlobalEditing, isZoomPreviewActive, previewScaleFactor]);

  const questionNode = (
    <div
      data-card-face="question"
      className={shouldFillFaceHeight ? "min-w-0 h-full" : "min-w-0"}
    >
      <PreparedViewCardFaceScene
        card={card}
        sharedDerived={dualDerived}
        sideDerived={dualDerived.question}
        displayMode={currentDisplayMode}
        fixedScale={metrics.sideFixedScale}
        fixedHeightPx={fixedHeightPx}
        contentZoom={metrics.sideContentZoom}
        headerIconVisualScale={metrics.sideHeaderIconVisualScale}
        previewMode={true}
        showInkLayer={currentDisplayMode === "fixed"}
        drawMode={false}
        inkEditingEnabled={false}
        fillHeight={shouldFillFaceHeight}
      />
    </div>
  );

  const answerNode = (
    <div
      data-card-face="answer"
      className={shouldFillFaceHeight ? "min-w-0 h-full" : "min-w-0"}
    >
      <PreparedViewCardFaceScene
        card={card}
        sharedDerived={dualDerived}
        sideDerived={dualDerived.answer}
        displayMode={currentDisplayMode}
        fixedScale={metrics.sideFixedScale}
        fixedHeightPx={fixedHeightPx}
        contentZoom={metrics.sideContentZoom}
        headerIconVisualScale={metrics.sideHeaderIconVisualScale}
        previewMode={true}
        showInkLayer={currentDisplayMode === "fixed"}
        drawMode={false}
        inkEditingEnabled={false}
        fillHeight={shouldFillFaceHeight}
      />
    </div>
  );

  let surfaceContent: React.ReactNode;

  if (isGlobalEditing) {
    surfaceContent = (
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
  } else if (currentCardLayoutMode !== "flip") {
    surfaceContent = (
      <CardSurfaceLayout
        cardLayoutMode={currentCardLayoutMode}
        questionNode={questionNode}
        answerNode={answerNode}
      />
    );
  } else {
    surfaceContent = (
      <div
        data-card-face={isFlipped ? "answer" : "question"}
        className="min-w-0"
      >
        <PreparedViewCardFaceScene
          card={card}
          sharedDerived={dualDerived}
          sideDerived={isFlipped ? dualDerived.answer : dualDerived.question}
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
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-visible">
      <div
        className="w-full min-w-0 max-w-full overflow-visible"
        style={zoomPreviewStyle}
      >
        {surfaceContent}
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
  if (prev.previewScaleFactor !== next.previewScaleFactor) return false;
  if (prev.isZoomPreviewActive !== next.isZoomPreviewActive) return false;
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
