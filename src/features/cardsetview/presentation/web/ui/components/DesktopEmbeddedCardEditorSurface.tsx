import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import {
  CARD_ROW_PX,
  layoutRowsToCardHeightPx,
} from "@/components/card/common/constants";
import { CardCornerActions } from "@/components/card/frame/CardCornerActions";
import { FaceSwitchBadge } from "@/components/card/frame/FaceSwitchBadge";
import { CardOverlayTopRight } from "@/components/card/frame/CardOverlayTopRight";
import { CardEditorPaneMediaDialogs } from "@/components/folder/panes/CardEditorPaneMediaDialogs";
import { useCardEditorPaneController } from "@/components/folder/panes/useCardEditorPaneController";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { buildSharedCardSurfaceMetrics } from "@/features/cardsetview/presentation/web/ui/components/cardSurfacePresentation";
import { CardSurfaceLayout } from "@/features/cardsetview/presentation/web/ui/components/CardSurfaceLayout";
import { CardFaceScene } from "@/features/cardsetview/presentation/web/ui/components/CardFaceScene";
import type { Card, UserSettings } from "@/types";
import type { CardBlock } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Side = "question" | "answer";
type EditorSettings = Partial<UserSettings> | null | undefined;

export interface DesktopEmbeddedCardEditorSurfaceProps {
  selectedCardId: string;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride?: Card[];
  settings?: Partial<UserSettings> | null;
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  zoomScale: number;
  isInteractive: boolean;
  onSyncStatusChange: (status: CardSyncStatus | null) => void;
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
  typeof (value as { id?: unknown }).id === "string";

const toTimeMs = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const nextDate = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(nextDate.getTime()) ? null : nextDate.getTime();
  }

  if (typeof value === "string" || typeof value === "number") {
    const nextDate = new Date(value);
    return Number.isNaN(nextDate.getTime()) ? null : nextDate.getTime();
  }

  return null;
};

const resolveFaceLabel = (side: Side) =>
  side === "question" ? "問題" : "解答";

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

export const DesktopEmbeddedCardEditorSurface = ({
  selectedCardId,
  folderId,
  cardSetId,
  cardsOverride,
  settings = null,
  displayMode,
  cardLayoutMode,
  zoomScale,
  isInteractive,
  onSyncStatusChange,
}: DesktopEmbeddedCardEditorSurfaceProps) => {
  const controller = useCardEditorPaneController({
    selectedCardId,
    folderId: folderId ?? undefined,
    cardSetId: cardSetId ?? undefined,
    cardsOverride,
    autoEdit: true,
    settingsOverride: settings,
  });

  const { settings: controllerSettings, session, layout, content } = controller;
  const {
    draft,
    normalizedSelectedCardId,
    selectedCard,
    isFlipped,
    setIsFlipped,
    isEditing,
    lastSavedAt,
    saveError,
    flushDraft,
    handleToggleBookmark,
    handleToggleUncertainty,
  } = session;

  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [showRetryErrorState, setShowRetryErrorState] = useState(false);

  useEffect(() => {
    if (saveError) {
      setShowRetryErrorState(true);
      return;
    }

    if (!isRetryingSync) {
      setShowRetryErrorState(false);
    }
  }, [isRetryingSync, saveError]);

  const metrics = useMemo(
    () =>
      buildSharedCardSurfaceMetrics({
        displayMode,
        cardLayoutMode,
        zoomScale,
      }),
    [cardLayoutMode, displayMode, zoomScale],
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
    layout.manualResizeInProgressRef.current = true;
  }, [layout.manualResizeInProgressRef]);

  const handleResizeEnd = useCallback(() => {
    layout.manualResizeInProgressRef.current = false;
  }, [layout.manualResizeInProgressRef]);

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

  const iconPxFromScale = useCallback((headerIconVisualScale: number) => {
    const safeScale =
      Number.isFinite(headerIconVisualScale) && headerIconVisualScale > 0
        ? headerIconVisualScale
        : 1;

    return 14 / safeScale;
  }, []);

  const splitCornerActions = useMemo(
    () =>
      selectedCardEntity ? (
        <CardCornerActions
          onHelp={() => handleToggleUncertainty(selectedCardEntity)}
          onStar={() => handleToggleBookmark(selectedCardEntity)}
          helpActive={selectedCardEntity.hasUncertainty ?? false}
          starActive={selectedCardEntity.isBookmarked ?? false}
          disabled={!isInteractive}
          iconPx={iconPxFromScale(metrics.sideHeaderIconVisualScale)}
        />
      ) : undefined,
    [
      handleToggleBookmark,
      handleToggleUncertainty,
      iconPxFromScale,
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
          iconPx={iconPxFromScale(metrics.baseHeaderIconVisualScale)}
        />
      ) : undefined,
    [
      handleToggleBookmark,
      handleToggleUncertainty,
      iconPxFromScale,
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

  const handleRetrySync = useCallback(async () => {
    if (!showRetryErrorState) return;

    setIsRetryingSync(true);
    try {
      const saved = await flushDraft({
        reason: "autosave",
        showSuccessToast: false,
      });

      if (saved) {
        setShowRetryErrorState(false);
      }
    } finally {
      setIsRetryingSync(false);
    }
  }, [flushDraft, showRetryErrorState]);

  const fallbackLastSyncedAtMs = useMemo(
    () =>
      lastSavedAt?.getTime() ??
      toTimeMs(selectedCardEntity?.updatedAt) ??
      toTimeMs(selectedCardEntity?.createdAt) ??
      null,
    [lastSavedAt, selectedCardEntity?.createdAt, selectedCardEntity?.updatedAt],
  );

  const syncStatus = useMemo<CardSyncStatus>(
    () => ({
      lastSyncedAtMs: fallbackLastSyncedAtMs,
      hasError: showRetryErrorState,
      isRetrying: isRetryingSync,
      retry: showRetryErrorState ? handleRetrySync : null,
    }),
    [
      fallbackLastSyncedAtMs,
      handleRetrySync,
      isRetryingSync,
      showRetryErrorState,
    ],
  );

  useEffect(() => {
    if (!isInteractive) {
      onSyncStatusChange(null);
      return;
    }

    onSyncStatusChange(syncStatus);

    return () => {
      onSyncStatusChange(null);
    };
  }, [isInteractive, onSyncStatusChange, syncStatus]);

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
  );

  const answerFace = (
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
  );

  return (
    <>
      <div className="w-full min-w-0 max-w-full overflow-visible">
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
