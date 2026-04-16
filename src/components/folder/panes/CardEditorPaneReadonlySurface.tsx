import { SharedCardAttachments } from "@/components/card/common/SharedCardAttachments";
import { layoutRowsToCardHeightPx } from "@/components/card/common/constants";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { buildSharedCardSurfaceMetrics } from "@/features/cardsetview/presentation/web/ui/components/cardSurfacePresentation";
import { CardSurfaceLayout } from "@/features/cardsetview/presentation/web/ui/components/CardSurfaceLayout";
import { ViewCardFaceScene } from "@/features/cardsetview/presentation/web/ui/components/ViewCardFaceScene";
import type { Card } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React from "react";

type Side = "question" | "answer";

export type CardEditorPaneReadonlySurfaceProps = Readonly<{
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  onToggleUncertainty?: (card: Card) => void | Promise<void>;
  onToggleBookmark?: (card: Card) => void | Promise<void>;
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  zoomScale: number;
}>;

const ReadonlyFaceWithAttachments = ({
  faceNode,
  attachments,
}: Readonly<{
  faceNode: React.ReactNode;
  attachments: Card["front"]["attachments"] | Card["back"]["attachments"];
}>) => {
  return (
    <div className="w-full min-w-0">
      {faceNode}
      <SharedCardAttachments attachments={attachments} />
    </div>
  );
};

export const CardEditorPaneReadonlySurface = ({
  card,
  isFlipped,
  onFlip,
  onToggleUncertainty,
  onToggleBookmark,
  displayMode,
  cardLayoutMode,
  zoomScale,
}: CardEditorPaneReadonlySurfaceProps) => {
  const metrics = React.useMemo(
    () =>
      buildSharedCardSurfaceMetrics({
        displayMode,
        cardLayoutMode,
        zoomScale,
      }),
    [cardLayoutMode, displayMode, zoomScale],
  );

  const fixedHeightPx = React.useMemo(
    () =>
      displayMode === "fluid"
        ? null
        : layoutRowsToCardHeightPx(normalizeLayoutRows(card.layoutRows)),
    [card.layoutRows, displayMode],
  );

  const questionFace = (
    <ViewCardFaceScene
      card={card}
      side="question"
      displayMode={displayMode}
      fixedScale={metrics.sideFixedScale}
      fixedHeightPx={fixedHeightPx}
      contentZoom={metrics.sideContentZoom}
      headerIconVisualScale={metrics.sideHeaderIconVisualScale}
      previewMode={true}
      showInkLayer={displayMode === "fixed"}
      drawMode={false}
      inkEditingEnabled={false}
      onToggleUncertainty={onToggleUncertainty}
      onToggleBookmark={onToggleBookmark}
    />
  );

  const answerFace = (
    <ViewCardFaceScene
      card={card}
      side="answer"
      displayMode={displayMode}
      fixedScale={metrics.sideFixedScale}
      fixedHeightPx={fixedHeightPx}
      contentZoom={metrics.sideContentZoom}
      headerIconVisualScale={metrics.sideHeaderIconVisualScale}
      previewMode={true}
      showInkLayer={displayMode === "fixed"}
      drawMode={false}
      inkEditingEnabled={false}
      onToggleUncertainty={onToggleUncertainty}
      onToggleBookmark={onToggleBookmark}
    />
  );

  const activeFlipSide: Side = isFlipped ? "answer" : "question";
  const activeFlipAttachments =
    activeFlipSide === "question"
      ? card.front.attachments
      : card.back.attachments;

  const flipFace = (
    <ViewCardFaceScene
      card={card}
      side={activeFlipSide}
      displayMode={displayMode}
      fixedScale={metrics.baseFixedScale}
      fixedHeightPx={fixedHeightPx}
      contentZoom={metrics.baseContentZoom}
      headerIconVisualScale={metrics.baseHeaderIconVisualScale}
      previewMode={false}
      showInkLayer={metrics.renderSpec.showInk}
      drawMode={false}
      inkEditingEnabled={false}
      onFlip={onFlip}
      onToggleUncertainty={onToggleUncertainty}
      onToggleBookmark={onToggleBookmark}
    />
  );

  return (
    <CardSurfaceLayout
      cardLayoutMode={cardLayoutMode}
      questionNode={
        <ReadonlyFaceWithAttachments
          faceNode={questionFace}
          attachments={card.front.attachments}
        />
      }
      answerNode={
        <ReadonlyFaceWithAttachments
          faceNode={answerFace}
          attachments={card.back.attachments}
        />
      }
      flipNode={
        <ReadonlyFaceWithAttachments
          faceNode={flipFace}
          attachments={activeFlipAttachments}
        />
      }
    />
  );
};
