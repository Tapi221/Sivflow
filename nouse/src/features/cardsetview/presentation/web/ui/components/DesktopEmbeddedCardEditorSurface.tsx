import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardEditorPaneMediaDialogs } from "@web-renderer/chip/panel/dialog.desktop/Dialog.CardEditorPaneMedia";
import { CardCornerActions } from "@/components/card/frame/CardCornerActions";
import { CardOverlayTopRight } from "@/components/card/frame/CardOverlayTopRight";
import { FaceSwitchBadge } from "@/components/card/frame/FaceSwitchBadge";
import { useCardEditorPaneController } from "@/components/folder/panes/useCardEditorPaneController";
import { CANONICAL_CARD_WIDTH, CARD_ROW_PX, layoutRowsToCardHeightPx } from "@/domain/card/cardGeometry.constants";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import { resolveEditorCardFitScale } from "@/domain/card/resolveEditorCardFitScale";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CardFaceScene } from "./CardFaceScene";
import { CardSurfaceLayout } from "./CardSurfaceLayout";
import { buildCardSurfaceMetrics } from "./cardSurfacePresentation";
import type { Card, UserSettings } from "@/types";
import type { CardBlock } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";



type Side = "question" | "answer";
type EditorSettings = Partial<UserSettings> | null | undefined;
interface DesktopEmbeddedCardEditorSurfaceProps {
  selectedCardId: string;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride?: Card[];
  settings?: Partial<UserSettings> | null;
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  zoomScale: number;
  isInteractive: boolean;
}
type EmbeddedEditorHeaderRightProps = Readonly<{
  mediaActions?: React.ReactNode;
}>;
type EmbeddedEditorFaceProps = Readonly<{
  side: Side;
  blocks: CardBlock[];
  onBlocksChange: (nextBlocks: CardBlock[]) => void;
  accentColor?: string;
  duplicateToOpposite?: boolean;
  settings: EditorSettings;
  displayMode: CardDisplayMode;
  fixedScale?: number;
  contentZoom: number;
  actionsTopLeft?: React.ReactNode;
  actionsTopRight?: React.ReactNode;
  overlayTopRight?: React.ReactNode;
  editorCardHeightPx: number | null;
  enableHeightResize: boolean;
  showResizeHandle: boolean;
  showToolbar: boolean;
  onHeightChange: (heightPx: number) => void;
  onMinHeightChange: (heightPx: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
}>;



const isCardEntity = (value: unknown): value is Card =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof (value as { id?: unknown; }).id === "string";
const resolveFaceLabel = (side: Side) =>
  side === "question" ? "問題" : "解答";
const measureSurfaceViewportWidth = (element: HTMLDivElement) =>
  Math.max(
    0,
    Math.round(
      Math.max(element.clientWidth, element.parentElement?.clientWidth ?? 0),
    ),
  );



const EmbeddedEditorHeaderRight = ({
  mediaActions,
}: EmbeddedEditorHeaderRightProps) => {
  if (!mediaActions) return null;

  return (
    <div
      className="flex items-center gap-2"
      data-card-no-flip="true"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {mediaActions}
    </div>
  );
};
const EmbeddedEditorFace = ({
  side,
  blocks,
  onBlocksChange,
  accentColor,
  duplicateToOpposite,
  settings,
  displayMode,
  fixedScale,
  contentZoom,
  actionsTopLeft,
  actionsTopRight,
  overlayTopRight,
  editorCardHeightPx,
  enableHeightResize,
  showResizeHandle,
  showToolbar,
  onHeightChange,
  onMinHeightChange,
  onResizeStart,
  onResizeEnd,
}: EmbeddedEditorFaceProps) => {
  const [toolbarMount, setToolbarMount] = useState<HTMLDivElement | null>(null);

  const topAttachment = showToolbar ? (
    <div className="relative h-0 w-full overflow-visible pointer-events-none">
      <div
        ref={setToolbarMount}
        className="absolute right-0 top-0 z-20 pointer-events-auto"
        style={{ transform: "translate(calc(-100% - 12px), 16px)" }}
      />
    </div>
  ) : undefined;

  const overlay = overlayTopRight ? (
    <CardOverlayTopRight>{overlayTopRight}</CardOverlayTopRight>
  ) : undefined;

  return (
    <CardFaceScene
      displayMode={displayMode}
      fixedScale={fixedScale}
      contentZoom={contentZoom}
      contentProps={{
        mode: "edit",
        blocks,
        onChange: onBlocksChange,
        prefix: side,
        label: resolveFaceLabel(side),
        accentColor,
        duplicateToOpposite,
        hideToolbar: !showToolbar,
        toolbarMount,
        toolbarDesktopLayout: "vertical",
        enableBlockSelectionState: showToolbar,
        settings,
      }}
      actionsTopLeft={actionsTopLeft}
      actionsTopRight={actionsTopRight}
      overlay={overlay}
      topAttachment={topAttachment}
      resizable={enableHeightResize}
      showResizeHandle={enableHeightResize && showResizeHandle}
      resizeStepPx={enableHeightResize ? CARD_ROW_PX : undefined}
      heightPx={enableHeightResize ? editorCardHeightPx : null}
      lockHeight={enableHeightResize}
      onHeightChange={onHeightChange}
      onMinHeightChange={onMinHeightChange}
      onResizeStart={onResizeStart}
      onResizeEnd={onResizeEnd}
    />
  );
};
const DesktopEmbeddedCardEditorSurface = ({ selectedCardId, folderId, cardSetId, cardsOverride, settings = null, displayMode, cardLayoutMode, zoomScale, isInteractive }: DesktopEmbeddedCardEditorSurfaceProps) => {
  const controller = useCardEditorPaneController({ selectedCardId, folderId: folderId ?? undefined, cardSetId: cardSetId ?? undefined, cardsOverride, autoEdit: true, settingsOverride: settings });

  const { settings: controllerSettings, session, layout, content } = controller;
  const {
    draft,
    normalizedSelectedCardId,
    selectedCard,
    isFlipped,
    setIsFlipped,
    isEditing,
    flushDraft,
    handleToggleBookmark,
    handleToggleUncertainty,
  } = session;

  const surfaceViewportRef = useRef<HTMLDivElement | null>(null);
  const [surfaceViewportWidth, setSurfaceViewportWidth] = useState(0);

  useEffect(() => {
    const element = surfaceViewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const nextWidth = measureSurfaceViewportWidth(element);
      setSurfaceViewportWidth((prev) =>
        prev === nextWidth ? prev : nextWidth,
      );
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const editorCardFitScale = useMemo(
    () =>
      resolveEditorCardFitScale({
        availablePaneWidthPx: surfaceViewportWidth,
        canonicalCardWidth: CANONICAL_CARD_WIDTH,
        cardLayoutMode,
      }),
    [cardLayoutMode, surfaceViewportWidth],
  );

  const metrics = useMemo(
    () =>
      buildCardSurfaceMetrics({
        displayMode,
        cardLayoutMode,
        interactionMode: isInteractive ? "edit" : "view",
        zoomScale,
        fitScale: editorCardFitScale,
        showInk: displayMode === "fixed" && !isInteractive,
      }),
    [cardLayoutMode, displayMode, editorCardFitScale, isInteractive, zoomScale],
  );

  const editorCardHeightPx = useMemo(
    () =>
      displayMode === "fluid" || !draft
        ? null
        : layoutRowsToCardHeightPx(normalizeLayoutRows(draft.layoutRows)),
    [displayMode, draft],
  );

  const handleEditorHeightChange = useCallback(
    (heightPx: number) => {
      layout.scheduleLayoutRowsFromHeight(heightPx);
    },
    [layout],
  );

  const handleResizeStart = useCallback(() => {
    layout.setManualResizeInProgress(true);
  }, [layout]);

  const handleResizeEnd = useCallback(() => {
    layout.setManualResizeInProgress(false);
  }, [layout]);

  const handleQuestionBlocksChange = useCallback(
    (nextBlocks: CardBlock[]) => {
      content.setSideBlocks("question", nextBlocks);
    },
    [content],
  );

  const handleAnswerBlocksChange = useCallback(
    (nextBlocks: CardBlock[]) => {
      content.setSideBlocks("answer", nextBlocks);
    },
    [content],
  );

  const selectedCardEntity = isCardEntity(selectedCard) ? selectedCard : null;
  const frontBlocks = draft?.frontBlocks ?? [];
  const backBlocks = draft?.backBlocks ?? [];
  const faceAnchorClassName = displayMode === "fluid" && cardLayoutMode === "split" ? "min-w-0 h-full" : "min-w-0";

  const splitCornerActions = useMemo(
    () =>
      selectedCardEntity ? (
        <CardCornerActions
          onHelp={() => handleToggleUncertainty(selectedCardEntity)}
          onStar={() => handleToggleBookmark(selectedCardEntity)}
          helpActive={selectedCardEntity.hasUncertainty ?? false}
          starActive={selectedCardEntity.isBookmarked ?? false}
          disabled={!isInteractive}
          visualScale={metrics.sideHeaderIconVisualScale}
        />
      ) : undefined,
    [
      handleToggleBookmark,
      handleToggleUncertainty,
      isInteractive,
      metrics.sideHeaderIconVisualScale,
      selectedCardEntity,
    ],
  );

  const flipCornerActions = useMemo(
    () =>
      selectedCardEntity ? (
        <CardCornerActions
          onHelp={() => handleToggleUncertainty(selectedCardEntity)}
          onStar={() => handleToggleBookmark(selectedCardEntity)}
          helpActive={selectedCardEntity.hasUncertainty ?? false}
          starActive={selectedCardEntity.isBookmarked ?? false}
          disabled={!isInteractive}
          visualScale={metrics.baseHeaderIconVisualScale}
        />
      ) : undefined,
    [
      handleToggleBookmark,
      handleToggleUncertainty,
      isInteractive,
      metrics.baseHeaderIconVisualScale,
      selectedCardEntity,
    ],
  );

  const questionMediaActions = content.renderMediaDialogButtons("question");
  const answerMediaActions = content.renderMediaDialogButtons("answer");

  const faceSwitchBadge = useMemo(
    () => (
      <FaceSwitchBadge
        isFlipped={Boolean(isFlipped)}
        onShowFront={() => setIsFlipped(false)}
        onShowBack={() => setIsFlipped(true)}
      />
    ),
    [isFlipped, setIsFlipped],
  );

  const previousInteractiveRef = useRef(isInteractive);
  useEffect(() => {
    const wasInteractive = previousInteractiveRef.current;
    previousInteractiveRef.current = isInteractive;

    if (!wasInteractive || isInteractive) return;
    if (!isEditing || !draft) return;

    void flushDraft({
      reason: "switch",
      showSuccessToast: false,
    });
  }, [draft, flushDraft, isEditing, isInteractive]);

  if (!draft || !normalizedSelectedCardId) {
    return null;
  }

  const questionFace = (
    <div data-card-face="question" className={faceAnchorClassName}>
      <EmbeddedEditorFace
        side="question"
        blocks={frontBlocks}
        onBlocksChange={handleQuestionBlocksChange}
        accentColor={controllerSettings?.accentColor}
        duplicateToOpposite={controllerSettings?.duplicateToOpposite}
        settings={controllerSettings}
        displayMode={displayMode}
        fixedScale={metrics.sideFixedScale}
        contentZoom={metrics.sideContentZoom}
        actionsTopLeft={splitCornerActions}
        actionsTopRight={
          <EmbeddedEditorHeaderRight mediaActions={questionMediaActions} />
        }
        editorCardHeightPx={editorCardHeightPx}
        enableHeightResize={displayMode !== "fluid"}
        showResizeHandle={isInteractive}
        showToolbar={isInteractive}
        onHeightChange={handleEditorHeightChange}
        onMinHeightChange={layout.handleQuestionMinHeightChange}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />
    </div>
  );

  const answerFace = (
    <div data-card-face="answer" className={faceAnchorClassName}>
      <EmbeddedEditorFace
        side="answer"
        blocks={backBlocks}
        onBlocksChange={handleAnswerBlocksChange}
        accentColor={controllerSettings?.accentColor}
        duplicateToOpposite={controllerSettings?.duplicateToOpposite}
        settings={controllerSettings}
        displayMode={displayMode}
        fixedScale={metrics.sideFixedScale}
        contentZoom={metrics.sideContentZoom}
        actionsTopLeft={splitCornerActions}
        actionsTopRight={
          <EmbeddedEditorHeaderRight mediaActions={answerMediaActions} />
        }
        editorCardHeightPx={editorCardHeightPx}
        enableHeightResize={displayMode !== "fluid"}
        showResizeHandle={isInteractive}
        showToolbar={isInteractive}
        onHeightChange={handleEditorHeightChange}
        onMinHeightChange={layout.handleAnswerMinHeightChange}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />
    </div>
  );

  const activeFlipSide: Side = isFlipped ? "answer" : "question";
  const flipBlocks = activeFlipSide === "question" ? frontBlocks : backBlocks;
  const flipMediaActions =
    activeFlipSide === "question" ? questionMediaActions : answerMediaActions;
  const handleFlipBlocksChange =
    activeFlipSide === "question"
      ? handleQuestionBlocksChange
      : handleAnswerBlocksChange;
  const handleFlipMinHeightChange =
    activeFlipSide === "question"
      ? layout.handleQuestionMinHeightChange
      : layout.handleAnswerMinHeightChange;

  const flipFace = (
    <div data-card-face={activeFlipSide} className={faceAnchorClassName}>
      <EmbeddedEditorFace
        side={activeFlipSide}
        blocks={flipBlocks}
        onBlocksChange={handleFlipBlocksChange}
        accentColor={controllerSettings?.accentColor}
        duplicateToOpposite={controllerSettings?.duplicateToOpposite}
        settings={controllerSettings}
        displayMode={displayMode}
        fixedScale={metrics.baseFixedScale}
        contentZoom={metrics.baseContentZoom}
        actionsTopLeft={flipCornerActions}
        editorCardHeightPx={editorCardHeightPx}
        enableHeightResize={displayMode !== "fluid"}
        showResizeHandle={isInteractive}
        showToolbar={isInteractive}
        overlayTopRight={
          <>
            {faceSwitchBadge}
            {flipMediaActions ? (
              <div
                className="flex max-w-full justify-end"
                data-card-no-flip="true"
              >
                {flipMediaActions}
              </div>
            ) : null}
          </>
        }
        onHeightChange={handleEditorHeightChange}
        onMinHeightChange={handleFlipMinHeightChange}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />
    </div>
  );

  return (
    <>
      <div
        ref={surfaceViewportRef}
        className="w-full min-w-0 max-w-full overflow-visible"
      >
        <CardSurfaceLayout
          cardLayoutMode={cardLayoutMode}
          questionNode={questionFace}
          answerNode={answerFace}
          flipNode={flipFace}
        />
      </div>
      <CardEditorPaneMediaDialogs
        imageDialogSide={content.imageDialogSide}
        setImageDialogSide={content.setImageDialogSide}
        audioDialogSide={content.audioDialogSide}
        setAudioDialogSide={content.setAudioDialogSide}
        linkDialogSide={content.linkDialogSide}
        setLinkDialogSide={content.setLinkDialogSide}
        getDialogImages={content.getDialogImages}
        setDialogImages={content.setDialogImages}
        getDialogAudios={content.getDialogAudios}
        setDialogAudios={content.setDialogAudios}
        getReferenceItems={content.getReferenceItems}
        setReferenceItems={content.setReferenceItems}
      />
    </>
  );
};



export { DesktopEmbeddedCardEditorSurface };


export type { DesktopEmbeddedCardEditorSurfaceProps };
