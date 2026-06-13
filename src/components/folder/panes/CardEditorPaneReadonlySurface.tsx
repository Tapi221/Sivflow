import React from "react";
import { CardFaceWithAttachments } from "@/components/card/common/CardFaceWithAttachments";
import { layoutRowsToCardHeightPx } from "@/domain/card/cardGeometry.constants";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CardSurfaceLayout } from "@/features/cardsetview/presentation/web/ui/components/CardSurfaceLayout";
import { buildCardSurfaceMetrics } from "@/features/cardsetview/presentation/web/ui/components/cardSurfacePresentation";
import { ViewCardFaceScene } from "@/features/cardsetview/presentation/web/ui/components/ViewCardFaceScene";
import type { Card } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";



type Side = "question" | "answer";
type CardEditorPaneReadonlySurfaceProps = Readonly<{ card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  onToggleUncertainty?: (card: Card) => void | Promise<void>;
  onToggleBookmark?: (card: Card) => void | Promise<void>;
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  zoomScale: number;
  fitScale?: number;
}>;



const CardEditorPaneReadonlySurface = ({ card, isFlipped, onFlip, onToggleUncertainty, onToggleBookmark, displayMode, cardLayoutMode, zoomScale, fitScale = 1 }: CardEditorPaneReadonlySurfaceProps) => {
  const metrics = React.useMemo(() => buildCardSurfaceMetrics({ displayMode, cardLayoutMode, interactionMode: "view", zoomScale, fitScale, showInk: displayMode === "fixed" }), [cardLayoutMode, displayMode, fitScale, zoomScale]);

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
        <CardFaceWithAttachments
          faceNode={questionFace}
          attachments={card.front.attachments}
        />
      }
      answerNode={
        <CardFaceWithAttachments
          faceNode={answerFace}
          attachments={card.back.attachments}
        />
      }
      flipNode={
        <CardFaceWithAttachments
          faceNode={flipFace}
          attachments={activeFlipAttachments}
        />
      }
    />
  );
};



export { CardEditorPaneReadonlySurface };


export type { CardEditorPaneReadonlySurfaceProps };
