import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "@web-renderer/chip/icons";
import { CardEditorPaneMediaDialogs } from "@web-renderer/chip/panel/dialog.desktop/Dialog.CardEditorPaneMedia";
import { cn } from "@web-renderer/lib/utils";
import { BlockEditModeContext } from "@/components/card/blocks/core/BlockEditModeContext";
import { CardFaceWithAttachments } from "@/components/card/common/CardFaceWithAttachments";
import { CardEditorLoadingState, NewCardIdleState } from "@/components/card/editor/CardEditorPaneStates";
import { CardCornerActions } from "@/components/card/frame/CardCornerActions";
import { CardOverlayTopRight } from "@/components/card/frame/CardOverlayTopRight";
import { FaceSwitchBadge } from "@/components/card/frame/FaceSwitchBadge";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import type { CardPresentationContext, CardPresentationContextInput, CardPresentationState } from "@/components/card/presentation/cardPresentation";
import { buildCardChromeClassName, buildCardShellClassName, resolveCardPresentationState } from "@/components/card/presentation/cardPresentation";
import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import { CardWorkspaceShell } from "@/components/card/shell/CardWorkspaceShell";
import { MetaPanelToggleIcon } from "@/components/card/shell/MetaPanelToggleIcon";
import { useCardSyncStatusReporter } from "@/components/card/shell/useCardSyncStatusReporter";
import { CardEditorPaneReadonlySurface } from "./CardEditorPaneReadonlySurface";
import { useCardEditorPaneController } from "./useCardEditorPaneController";
import { CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX, CARD_PANE_WIDTH_STEP_PX, useCardEditorPaneWidth } from "./useCardEditorPaneWidth";
import { CANONICAL_CARD_WIDTH, CARD_ROW_PX, layoutRowsToCardHeightPx } from "@/domain/card/cardGeometry.constants";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CardFaceScene } from "@/features/cardsetview/presentation/web/ui/components/CardFaceScene";
import { CardSurfaceLayout } from "@/features/cardsetview/presentation/web/ui/components/CardSurfaceLayout";
import { buildCardSurfaceMetrics } from "@/features/cardsetview/presentation/web/ui/components/cardSurfacePresentation";
import type { Card, CardBlock, CardFaceAttachments } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import { toMillisOrNull } from "@/utils/toMillis";



type CardEditorPaneSettings = {
  accentColor?: string;
  duplicateToOpposite?: boolean;
  delayBonusEnabled?: boolean;
  reviewStartNextDay?: boolean;
};
interface CardEditorPaneProps {
  selectedCardId: string | null;
  folderId?: string;
  cardSetId?: string;
  forcedPaneWidthPx?: number | null;
  cardsOverride?: Card[];
  autoEdit?: boolean;
  onCardUpdated?: () => void;
  onSelectCardId?: (cardId: string) => void;
  hideMetaPanel?: boolean;
  dockToolbarsToTop?: boolean;
  hideBlockToolbars?: boolean;
  externalToolbarMountQ?: HTMLDivElement | null;
  externalToolbarMountA?: HTMLDivElement | null;
  settingsOverride?: Partial<CardEditorPaneSettings> | null;
  embeddedInPager?: boolean;
  pairGapClassName?: string;
  presentationContext?: CardPresentationContextInput;
  showResizeHandle?: boolean;
  onSyncStatusChange?: (status: CardSyncStatus | null) => void;
  overlayTopInsetPx?: number;
  displayMode?: CardDisplayMode;
  cardLayoutMode?: CardLayoutMode;
  zoom?: number;
}
type _OverlayTopRightProps = Readonly<{
  children?: React.ReactNode;
}>;
type EditorSidePaneProps = {
  side: "question" | "answer";
  blocks: CardBlock[];
  attachments?: CardFaceAttachments;
  onBlocksChange: (blocks: CardBlock[]) => void;
  label: string;
  accentColor?: string;
  duplicateToOpposite?: boolean;
  hideToolbar: boolean;
  toolbarMount: HTMLDivElement | null;
  settings: unknown;
  shouldShowInlineToolbarMount: boolean;
  setInlineToolbarMount: (value: HTMLDivElement | null) => void;
  shouldDockToolbarToCardTop: boolean;
  dockToolbarInsideCardEdge: boolean;
  setDockedToolbarMount: (value: HTMLDivElement | null) => void;
  presentationState: CardPresentationState;
  enableBlockSelectionState: boolean;
  showResizeHandle: boolean;
  displayMode: CardDisplayMode;
  frameFixedScale?: number;
  contentZoom: number;
  editorCardHeightPx: number | null;
  enableHeightResize: boolean;
  onHeightChange: (heightPx: number) => void;
  onMinHeightChange: (minHeightPx: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  actionsTopLeft?: React.ReactNode;
  actionsTopRight?: React.ReactNode;
  overlayTopRight?: React.ReactNode;
};



const EMPTY_BLOCKS: CardBlock[] = [];



const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isCardEntity = (value: unknown): value is Card =>
  isRecord(value) && typeof value.id === "string";
const toTimeMs = (value: unknown): number | null => {
  return toMillisOrNull(value);
};
const getSettingsAccentColor = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.accentColor === "string"
    ? value.accentColor
    : undefined;
const getSettingsDuplicateToOpposite = (value: unknown): boolean | undefined =>
  isRecord(value) && typeof value.duplicateToOpposite === "boolean"
    ? value.duplicateToOpposite
    : undefined;
const toAudioDialogUrl = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }
  if (!isRecord(value)) return null;
  const candidates = [value.url, value.remoteUrl, value.localUrl];
  const resolved = candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim() !== "",
  );
  return resolved ?? null;
};
const _OverlayTopRight = ({ children }: _OverlayTopRightProps) => {
  if (!children) return null;
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-30">
      <div
        className="pointer-events-auto flex max-w-full flex-col items-end gap-2"
        data-card-no-flip="true"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
const areEditorSidePanePropsEqual = (
  prev: EditorSidePaneProps,
  next: EditorSidePaneProps,
) =>
  prev.side === next.side &&
  prev.blocks === next.blocks &&
  prev.attachments === next.attachments &&
  prev.label === next.label &&
  prev.accentColor === next.accentColor &&
  prev.duplicateToOpposite === next.duplicateToOpposite &&
  prev.hideToolbar === next.hideToolbar &&
  prev.toolbarMount === next.toolbarMount &&
  prev.settings === next.settings &&
  prev.shouldShowInlineToolbarMount === next.shouldShowInlineToolbarMount &&
  prev.shouldDockToolbarToCardTop === next.shouldDockToolbarToCardTop &&
  prev.dockToolbarInsideCardEdge === next.dockToolbarInsideCardEdge &&
  prev.presentationState.isActiveCard === next.presentationState.isActiveCard &&
  prev.presentationState.isInteractiveCard ===
  next.presentationState.isInteractiveCard &&
  prev.presentationState.showEditingOutline ===
  next.presentationState.showEditingOutline &&
  prev.presentationState.showActiveChrome ===
  next.presentationState.showActiveChrome &&
  prev.enableBlockSelectionState === next.enableBlockSelectionState &&
  prev.showResizeHandle === next.showResizeHandle &&
  prev.displayMode === next.displayMode &&
  prev.frameFixedScale === next.frameFixedScale &&
  prev.contentZoom === next.contentZoom &&
  prev.editorCardHeightPx === next.editorCardHeightPx &&
  prev.enableHeightResize === next.enableHeightResize &&
  prev.actionsTopLeft === next.actionsTopLeft &&
  prev.actionsTopRight === next.actionsTopRight &&
  prev.overlayTopRight === next.overlayTopRight;



const EditorSidePaneInner = ({
  side,
  blocks,
  attachments,
  onBlocksChange,
  label,
  accentColor,
  duplicateToOpposite,
  hideToolbar,
  toolbarMount,
  settings,
  shouldShowInlineToolbarMount,
  setInlineToolbarMount,
  shouldDockToolbarToCardTop,
  dockToolbarInsideCardEdge,
  setDockedToolbarMount,
  presentationState,
  enableBlockSelectionState,
  showResizeHandle,
  displayMode,
  frameFixedScale,
  contentZoom,
  editorCardHeightPx,
  enableHeightResize,
  onHeightChange,
  onMinHeightChange,
  onResizeStart,
  onResizeEnd,
  actionsTopLeft,
  actionsTopRight,
  overlayTopRight,
}: EditorSidePaneProps) => {
  const frameClassName = cn(
    buildCardShellClassName(presentationState),
    displayMode === "fluid" &&
    "rounded-none border-none bg-transparent shadow-none",
  );
  const [internalToolbarMount, _setInternalToolbarMount] =
    useState<HTMLDivElement | null>(null);
  const resolvedToolbarMount = toolbarMount ?? internalToolbarMount;
  const topAttachment = shouldDockToolbarToCardTop ? (
    <div className="pointer-events-none relative h-0 w-full overflow-visible">
      <div
        ref={setDockedToolbarMount}
        className={cn(
          "pointer-events-auto absolute top-0 z-20",
          side === "question" ? "left-0" : "right-0",
        )}
        style={{
          transform:
            side === "question"
              ? dockToolbarInsideCardEdge
                ? "translate(12px, 16px)"
                : "translate(calc(-100% - 12px), 16px)"
              : dockToolbarInsideCardEdge
                ? "translate(calc(-100% - 12px), 16px)"
                : "translate(calc(100% + 12px), 16px)",
        }}
      />
    </div>
  ) : undefined;
  const faceNode = (
    <div
      className={cn(
        buildCardChromeClassName(presentationState),
        "inline-block max-w-full align-top text-left",
      )}
    >
      <CardFaceScene
        displayMode={displayMode}
        fixedScale={frameFixedScale}
        contentZoom={contentZoom}
        frameClassName={frameClassName}
        topAttachment={topAttachment}
        actionsTopLeft={actionsTopLeft}
        actionsTopRight={actionsTopRight}
        overlay={
          overlayTopRight ? (
            <CardOverlayTopRight>{overlayTopRight}</CardOverlayTopRight>
          ) : undefined
        }
        resizable={enableHeightResize}
        showResizeHandle={enableHeightResize && showResizeHandle}
        resizeStepPx={enableHeightResize ? CARD_ROW_PX : undefined}
        heightPx={enableHeightResize ? editorCardHeightPx : null}
        lockHeight={enableHeightResize}
        onHeightChange={onHeightChange}
        onMinHeightChange={onMinHeightChange}
        onResizeStart={onResizeStart}
        onResizeEnd={onResizeEnd}
        contentProps={{
          mode: "edit",
          blocks,
          onChange: onBlocksChange,
          prefix: side,
          label,
          accentColor,
          duplicateToOpposite,
          hideToolbar,
          toolbarMount: resolvedToolbarMount,
          toolbarDesktopLayout: "horizontal",
          enableBlockSelectionState,
          settings,
        }}
      />
    </div>
  );
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col",
        shouldShowInlineToolbarMount ? "gap-2" : "gap-0",
      )}
    >
      {shouldShowInlineToolbarMount && (
        <div ref={setInlineToolbarMount} className="w-full" />
      )}
      <div className="w-full text-center">
        <CardFaceWithAttachments
          faceNode={faceNode}
          attachments={attachments}
          className="inline-block max-w-full align-top text-left"
        />
      </div>
    </div>
  );
};
const CardEditorPane = ({ selectedCardId, folderId, cardSetId, forcedPaneWidthPx = null, cardsOverride, autoEdit, onCardUpdated, onSelectCardId, hideMetaPanel = false, dockToolbarsToTop = false, hideBlockToolbars = false, externalToolbarMountQ = null, externalToolbarMountA = null, settingsOverride = null, embeddedInPager = false, pairGapClassName = "gap-0", presentationContext, showResizeHandle: showResizeHandleProp = true, onSyncStatusChange, overlayTopInsetPx = 0, displayMode = "fixed", cardLayoutMode = "split", zoom = 1 }: CardEditorPaneProps) => {
  const controller = useCardEditorPaneController({ selectedCardId, folderId, cardSetId, cardsOverride, autoEdit, onCardUpdated, onSelectCardId, settingsOverride });
  const { settings, isMetaOpen, session, layout, content, actions } =
    controller;
  const {
    draft,
    normalizedSelectedCardId,
    isNew,
    selectedCard,
    isFlipped,
    setIsFlipped,
    isEditing,
    setIsEditing,
    lastSavedAt,
    saveError,
    flushDraft,
    handleCancel,
    handleToggleBookmark,
    handleToggleUncertainty,
    panelCard,
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
  const cardPresentationContext = useMemo<CardPresentationContext>(() => {
    const isCurrentCard =
      presentationContext?.isCurrentCard ?? !embeddedInPager;
    return {
      inPager: embeddedInPager,
      isCurrentCard,
      isEditing,
      isStandaloneEditor: presentationContext?.isStandaloneEditor ?? false,
      hasFocusWithin: presentationContext?.hasFocusWithin ?? isCurrentCard,
    };
  }, [
    embeddedInPager,
    isEditing,
    presentationContext?.hasFocusWithin,
    presentationContext?.isCurrentCard,
    presentationContext?.isStandaloneEditor,
  ]);
  const cardPresentationState = useMemo(
    () => resolveCardPresentationState(cardPresentationContext),
    [cardPresentationContext],
  );
  const isFluidEditor = displayMode === "fluid";
  const {
    setManualResizeInProgress,
    scheduleLayoutRowsFromHeight,
    handleQuestionMinHeightChange,
    handleAnswerMinHeightChange,
  } = layout;
  const {
    setSideBlocks,
    imageDialogSide,
    setImageDialogSide,
    audioDialogSide,
    setAudioDialogSide,
    linkDialogSide,
    setLinkDialogSide,
    renderMediaDialogButtons,
    getDialogImages,
    setDialogImages,
    getDialogAudios,
    setDialogAudios,
    getReferenceItems,
    setReferenceItems,
  } = content;
  const { metaPanel } = actions;
  const [toolbarMountQInternal, setToolbarMountQInternal] =
    useState<HTMLDivElement | null>(null);
  const [toolbarMountAInternal, setToolbarMountAInternal] =
    useState<HTMLDivElement | null>(null);
  const toolbarMountQ = externalToolbarMountQ ?? toolbarMountQInternal;
  const toolbarMountA = externalToolbarMountA ?? toolbarMountAInternal;
  const usesExternalToolbarMount =
    Boolean(externalToolbarMountQ) && Boolean(externalToolbarMountA);
  const handleQuestionBlocksChange = useCallback(
    (blocks: CardBlock[]) => {
      setSideBlocks("question", blocks);
    },
    [setSideBlocks],
  );
  const handleAnswerBlocksChange = useCallback(
    (blocks: CardBlock[]) => {
      setSideBlocks("answer", blocks);
    },
    [setSideBlocks],
  );
  const frontBlocks = draft?.frontBlocks ?? EMPTY_BLOCKS;
  const backBlocks = draft?.backBlocks ?? EMPTY_BLOCKS;
  const frontAttachments = draft?.frontAttachments;
  const backAttachments = draft?.backAttachments;
  const editorCardHeightPx = useMemo(
    () =>
      isFluidEditor
        ? null
        : layoutRowsToCardHeightPx(normalizeLayoutRows(draft?.layoutRows)),
    [draft?.layoutRows, isFluidEditor],
  );
  const handleEditorHeightChange = useCallback(
    (heightPx: number) => {
      scheduleLayoutRowsFromHeight(heightPx);
    },
    [scheduleLayoutRowsFromHeight],
  );
  const handleResizeStart = useCallback(() => {
    setManualResizeInProgress(true);
  }, [setManualResizeInProgress]);
  const handleResizeEnd = useCallback(() => {
    setManualResizeInProgress(false);
  }, [setManualResizeInProgress]);
  const {
    contentViewportRef,
    showWidthControl,
    activePaneMode,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
    activePaneWidthPx,
    activePaneDisplayedDefaultWidthPx,
    shouldReserveWidthControlSpace,
    shouldDockToolbarToCardTop,
    shouldShowInlineToolbarMount,
    useTwoColumnEditorLayout,
    editorCardFitScale,
    activePaneWidthStyle,
    persistPaneWidth,
    previewPaneWidth,
    stepPaneWidth,
    resetActivePaneWidth,
  } = useCardEditorPaneWidth({
    settings,
    dockToolbarsToTop,
    embeddedInPager,
    hideBlockToolbars,
    forcedPaneWidthPx,
    usesExternalToolbarMount,
    isEditing,
    isMetaOpen,
    normalizedSelectedCardId,
    selectedCardId: selectedCardId ?? undefined,
    canonicalCardWidth: CANONICAL_CARD_WIDTH,
    cardSetId,
    cardLayoutMode,
  });
  const editorMetrics = useMemo(
    () =>
      buildCardSurfaceMetrics({
        displayMode,
        cardLayoutMode,
        interactionMode: "edit",
        zoomScale: zoom,
        showInk: false,
        fitScale: editorCardFitScale,
      }),
    [cardLayoutMode, displayMode, editorCardFitScale, zoom],
  );
  const activePaneModeValue: "edit" | "view" =
    activePaneMode === "edit" ? "edit" : "view";
  const shouldKeepDockedToolbarInsideCard =
    shouldDockToolbarToCardTop && isMetaOpen && !embeddedInPager;
  const selectedCardEntity = isCardEntity(selectedCard) ? selectedCard : null;
  const panelCardEntity = isCardEntity(panelCard) ? panelCard : null;
  const editorAccentColor = getSettingsAccentColor(settings);
  const editorDuplicateToOpposite = getSettingsDuplicateToOpposite(settings);
  const getDialogAudioUrls = useCallback(
    (side: "question" | "answer") =>
      getDialogAudios(side)
        .map((item) => toAudioDialogUrl(item))
        .filter((item): item is string => item !== null),
    [getDialogAudios],
  );
  const fallbackLastSyncedAtMs = useMemo(() => {
    return (
      lastSavedAt?.getTime() ??
      toTimeMs(
        (selectedCardEntity as { updatedAt?: unknown; } | null)?.updatedAt,
      ) ??
      toTimeMs(
        (selectedCardEntity as { createdAt?: unknown; } | null)?.createdAt,
      ) ??
      null
    );
  }, [lastSavedAt, selectedCardEntity]);
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
  useCardSyncStatusReporter({
    status: syncStatus,
    onSyncStatusChange,
  });
  const previousIsCurrentCardRef = useRef(
    cardPresentationContext.isCurrentCard,
  );
  useEffect(() => {
    const wasCurrentCard = previousIsCurrentCardRef.current;
    const isCurrentCard = cardPresentationContext.isCurrentCard;
    previousIsCurrentCardRef.current = isCurrentCard;
    if (!embeddedInPager) return;
    if (!wasCurrentCard || isCurrentCard) return;
    if (!isEditing || !draft) return;
    void flushDraft({
      reason: "switch",
      showSuccessToast: false,
    });
  }, [
    cardPresentationContext.isCurrentCard,
    draft,
    embeddedInPager,
    flushDraft,
    isEditing,
  ]);
  const sideEditorActionsTopLeft = useMemo(
    () =>
      selectedCardEntity ? (
        <CardCornerActions
          onHelp={() => handleToggleUncertainty(selectedCardEntity)}
          onStar={() => handleToggleBookmark(selectedCardEntity)}
          helpActive={selectedCardEntity.hasUncertainty ?? false}
          starActive={selectedCardEntity.isBookmarked ?? false}
          visualScale={editorMetrics.sideHeaderIconVisualScale}
        />
      ) : undefined,
    [
      editorMetrics.sideHeaderIconVisualScale,
      handleToggleBookmark,
      handleToggleUncertainty,
      selectedCardEntity,
    ],
  );
  const baseEditorActionsTopLeft = useMemo(
    () =>
      selectedCardEntity ? (
        <CardCornerActions
          onHelp={() => handleToggleUncertainty(selectedCardEntity)}
          onStar={() => handleToggleBookmark(selectedCardEntity)}
          helpActive={selectedCardEntity.hasUncertainty ?? false}
          starActive={selectedCardEntity.isBookmarked ?? false}
          visualScale={editorMetrics.baseHeaderIconVisualScale}
        />
      ) : undefined,
    [
      editorMetrics.baseHeaderIconVisualScale,
      handleToggleBookmark,
      handleToggleUncertainty,
      selectedCardEntity,
    ],
  );
  const questionBlocksForToolbar = draft?.frontBlocks;
  const questionActionsTopRight = useMemo(() => {
    void questionBlocksForToolbar;
    return renderMediaDialogButtons("question");
  }, [questionBlocksForToolbar, renderMediaDialogButtons]);
  const answerBlocksForToolbar = draft?.backBlocks;
  const answerActionsTopRight = useMemo(() => {
    void answerBlocksForToolbar;
    return renderMediaDialogButtons("answer");
  }, [answerBlocksForToolbar, renderMediaDialogButtons]);
  if (!normalizedSelectedCardId && !isEditing) {
    return null;
  }
  if (isNew && !isEditing) {
    return (
      <NewCardIdleState
        onStartEditing={() => setIsEditing(true)}
        onCancel={handleCancel}
      />
    );
  }
  if (!isNew && normalizedSelectedCardId && !selectedCard && !isEditing) {
    return <CardEditorLoadingState />;
  }
  if (isEditing && !draft) {
    return <CardEditorLoadingState />;
  }
  const widthControlProps = showWidthControl
    ? {
      modeLabel: isEditing ? "編集幅" : "閲覧幅",
      value: activePaneWidthPx,
      min: activePaneMinWidthPx,
      max: activePaneMaxWidthPx,
      defaultValue: activePaneDisplayedDefaultWidthPx,
      onPreviewChange: (value: number) =>
        previewPaneWidth(activePaneModeValue, value),
      onCommit: (value: number) => {
        void persistPaneWidth(activePaneModeValue, value);
      },
      onStepDown: () => stepPaneWidth(-CARD_PANE_WIDTH_STEP_PX),
      onStepUp: () => stepPaneWidth(CARD_PANE_WIDTH_STEP_PX),
      onReset: resetActivePaneWidth,
    }
    : null;
  const metaPanelNode = hideMetaPanel ? null : (
    <CardMetaPanel
      isVisible={isMetaOpen}
      card={panelCardEntity}
      isEditingCard={isEditing}
      reviewLogs={panelCardEntity?.reviewLogs ?? []}
      onAddReviewLog={({ reviewedAt, rating, durationMinutes }) =>
        metaPanel.onAddReviewLog({
          reviewedAt,
          rating,
          durationMinutes,
        })
      }
      onUpdateLatestReviewLog={({
        reviewLogs,
        reviewedAt,
        rating,
        durationMinutes,
      }) =>
        metaPanel.onUpdateLatestReviewLog({
          reviewLogs,
          reviewedAt,
          rating,
          durationMinutes,
        })
      }
      onDeleteLatestReviewLog={metaPanel.onDeleteLatestReviewLog}
      onUpdateReviewLogDuration={metaPanel.onUpdateReviewLogDuration}
      onFlushAutosave={() => {
        void metaPanel.onFlushAutosave();
      }}
      onTitleInputChange={metaPanel.onTitleInputChange}
      onUpdateTags={metaPanel.onUpdateTags}
      onToggleDraft={metaPanel.onToggleDraft}
      onUpdateTitle={metaPanel.onUpdateTitle}
      delayBonusEnabled={settings?.delayBonusEnabled ?? false}
      reviewStartNextDay={settings?.reviewStartNextDay ?? true}
      syncStatus={{
        lastSyncedAtMs: syncStatus.lastSyncedAtMs,
        hasError: syncStatus.hasError,
        isRetrying: syncStatus.isRetrying,
        canRetry: (syncStatus.retry !== null && syncStatus.retry !== undefined),
        onRetry: syncStatus.retry ?? undefined,
      }}
    />
  );
  const questionEditorPane = (
    <EditorSidePane
      side="question"
      blocks={frontBlocks}
      attachments={frontAttachments}
      onBlocksChange={handleQuestionBlocksChange}
      label="問題"
      accentColor={editorAccentColor}
      duplicateToOpposite={editorDuplicateToOpposite}
      hideToolbar={hideBlockToolbars}
      toolbarMount={toolbarMountQ}
      settings={settings}
      shouldShowInlineToolbarMount={shouldShowInlineToolbarMount}
      setInlineToolbarMount={setToolbarMountQInternal}
      shouldDockToolbarToCardTop={shouldDockToolbarToCardTop}
      dockToolbarInsideCardEdge={shouldKeepDockedToolbarInsideCard}
      setDockedToolbarMount={setToolbarMountQInternal}
      presentationState={cardPresentationState}
      enableBlockSelectionState={cardPresentationState.isInteractiveCard}
      showResizeHandle={showResizeHandleProp}
      displayMode={displayMode}
      frameFixedScale={editorMetrics.sideFixedScale}
      contentZoom={editorMetrics.sideContentZoom}
      editorCardHeightPx={editorCardHeightPx}
      enableHeightResize={!isFluidEditor}
      onHeightChange={handleEditorHeightChange}
      onMinHeightChange={handleQuestionMinHeightChange}
      onResizeStart={handleResizeStart}
      onResizeEnd={handleResizeEnd}
      actionsTopLeft={sideEditorActionsTopLeft}
      actionsTopRight={questionActionsTopRight}
    />
  );
  const answerEditorPane = (
    <EditorSidePane
      side="answer"
      blocks={backBlocks}
      attachments={backAttachments}
      onBlocksChange={handleAnswerBlocksChange}
      label="解答"
      accentColor={editorAccentColor}
      duplicateToOpposite={editorDuplicateToOpposite}
      hideToolbar={hideBlockToolbars}
      toolbarMount={toolbarMountA}
      settings={settings}
      shouldShowInlineToolbarMount={shouldShowInlineToolbarMount}
      setInlineToolbarMount={setToolbarMountAInternal}
      shouldDockToolbarToCardTop={shouldDockToolbarToCardTop}
      dockToolbarInsideCardEdge={shouldKeepDockedToolbarInsideCard}
      setDockedToolbarMount={setToolbarMountAInternal}
      presentationState={cardPresentationState}
      enableBlockSelectionState={cardPresentationState.isInteractiveCard}
      showResizeHandle={showResizeHandleProp}
      displayMode={displayMode}
      frameFixedScale={editorMetrics.sideFixedScale}
      contentZoom={editorMetrics.sideContentZoom}
      editorCardHeightPx={editorCardHeightPx}
      enableHeightResize={!isFluidEditor}
      onHeightChange={handleEditorHeightChange}
      onMinHeightChange={handleAnswerMinHeightChange}
      onResizeStart={handleResizeStart}
      onResizeEnd={handleResizeEnd}
      actionsTopLeft={sideEditorActionsTopLeft}
      actionsTopRight={answerActionsTopRight}
    />
  );
  const activeFlipSide: "question" | "answer" = isFlipped
    ? "answer"
    : "question";
  const flipBlocks = activeFlipSide === "question" ? frontBlocks : backBlocks;
  const flipAttachments =
    activeFlipSide === "question" ? frontAttachments : backAttachments;
  const flipActionsTopRight =
    activeFlipSide === "question"
      ? questionActionsTopRight
      : answerActionsTopRight;
  const handleFlipBlocksChange =
    activeFlipSide === "question"
      ? handleQuestionBlocksChange
      : handleAnswerBlocksChange;
  const handleFlipMinHeightChange =
    activeFlipSide === "question"
      ? handleQuestionMinHeightChange
      : handleAnswerMinHeightChange;
  const flipEditorPane = (
    <EditorSidePane
      side={activeFlipSide}
      blocks={flipBlocks}
      attachments={flipAttachments}
      onBlocksChange={handleFlipBlocksChange}
      label={activeFlipSide === "question" ? "問題" : "解答"}
      accentColor={editorAccentColor}
      duplicateToOpposite={editorDuplicateToOpposite}
      hideToolbar={hideBlockToolbars}
      toolbarMount={
        activeFlipSide === "question" ? toolbarMountQ : toolbarMountA
      }
      settings={settings}
      shouldShowInlineToolbarMount={shouldShowInlineToolbarMount}
      setInlineToolbarMount={
        activeFlipSide === "question"
          ? setToolbarMountQInternal
          : setToolbarMountAInternal
      }
      shouldDockToolbarToCardTop={shouldDockToolbarToCardTop}
      dockToolbarInsideCardEdge={shouldKeepDockedToolbarInsideCard}
      setDockedToolbarMount={
        activeFlipSide === "question"
          ? setToolbarMountQInternal
          : setToolbarMountAInternal
      }
      presentationState={cardPresentationState}
      enableBlockSelectionState={cardPresentationState.isInteractiveCard}
      showResizeHandle={showResizeHandleProp}
      displayMode={displayMode}
      frameFixedScale={editorMetrics.baseFixedScale}
      contentZoom={editorMetrics.baseContentZoom}
      editorCardHeightPx={editorCardHeightPx}
      enableHeightResize={!isFluidEditor}
      onHeightChange={handleEditorHeightChange}
      onMinHeightChange={handleFlipMinHeightChange}
      onResizeStart={handleResizeStart}
      onResizeEnd={handleResizeEnd}
      actionsTopLeft={baseEditorActionsTopLeft}
      overlayTopRight={
        <>
          <FaceSwitchBadge
            isFlipped={Boolean(isFlipped)}
            onShowFront={() => setIsFlipped(false)}
            onShowBack={() => setIsFlipped(true)}
          />
          {flipActionsTopRight ? (
            <div
              className="flex max-w-full justify-end"
              data-card-no-flip="true"
            >
              {flipActionsTopRight}
            </div>
          ) : null}
        </>
      }
    />
  );
  const editorPanelsNode = (
    <CardSurfaceLayout
      cardLayoutMode={
        cardLayoutMode === "flip"
          ? "flip"
          : useTwoColumnEditorLayout
            ? "split"
            : "stack"
      }
      questionNode={questionEditorPane}
      answerNode={answerEditorPane}
      flipNode={flipEditorPane}
      className={pairGapClassName}
    />
  );
  const readonlyEditButton = (
    <button
      type="button"
      className="inline-flex h-7 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 px-2 text-xs font-semibold leading-none text-slate-700 shadow-sm backdrop-blur-[2px] hover:bg-white"
      onClick={() => setIsEditing(true)}
    >
      編集
    </button>
  );
  const metaToggleButton =
    hideMetaPanel || !actions.toggleMetaOpen ? null : (
      <button
        type="button"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-700 shadow-sm backdrop-blur-[2px] transition-colors hover:bg-white hover:text-slate-900",
          isMetaOpen && "border-slate-300 bg-slate-100 text-slate-900",
        )}
        onClick={actions.toggleMetaOpen}
        aria-label={isMetaOpen ? "close meta panel" : "open meta panel"}
        aria-pressed={isMetaOpen}
      >
        {isMetaOpen ? (
          <X className="h-3.5 w-3.5" />
        ) : (
          <MetaPanelToggleIcon className="h-3.5 w-3.5" />
        )}
      </button>
    );
  const readonlyTopRightControls =
    selectedCardEntity && !isEditing ? (
      <div className="flex items-center gap-2">
        {readonlyEditButton}
        {metaToggleButton}
      </div>
    ) : (
      metaToggleButton
    );
  return (
    <BlockEditModeContext.Provider value={true}>
      <>
        <CardWorkspaceShell
          containerClassName={cn(
            "card-editor-right-pane-font pt-0",
            embeddedInPager ? "pb-0" : "pb-4",
            embeddedInPager ? "h-auto" : "h-full",
          )}
          shellClassName={cn(
            embeddedInPager
              ? "h-auto overflow-visible"
              : "h-full overflow-hidden",
          )}
          widthControl={widthControlProps}
          overlayChildren={null}
          overlayTopInsetPx={overlayTopInsetPx}
          topRightControl={readonlyTopRightControls}
          isMetaOpen={isMetaOpen}
          viewportRef={contentViewportRef}
          viewportClassName={cn(
            "card-editor-workspace-viewport",
            "flex min-w-0 flex-1 flex-col items-center",
            dockToolbarsToTop ? "overflow-x-visible" : "overflow-x-clip",
            embeddedInPager ? "overflow-y-visible" : "overflow-y-auto",
            isEditing
              ? dockToolbarsToTop
                ? embeddedInPager
                  ? "px-0 pt-0 pb-0"
                  : "px-0 pt-0 pb-4"
                : embeddedInPager
                  ? "px-0 pt-0 pb-0"
                  : "px-0 pt-0 pb-4"
              : "px-0 py-4",
          )}
          viewportStyle={
            embeddedInPager ? undefined : { background: "transparent" }
          }
          metaPanel={metaPanelNode}
        >
          {isEditing ? (
            <div
              className={cn(
                "flex w-full flex-col items-center gap-4",
                embeddedInPager &&
                (forcedPaneWidthPx === null || forcedPaneWidthPx === undefined) &&
                (dockToolbarsToTop ? "max-w-96" : "max-w-96"),
              )}
              style={{
                ...(activePaneWidthStyle ?? {}),
                ...(shouldReserveWidthControlSpace
                  ? { paddingTop: CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX }
                  : {}),
              }}
            >
              {editorPanelsNode}
            </div>
          ) : (
            selectedCardEntity && (
              <div className="flex w-full justify-center">
                <div className="w-full space-y-2" style={activePaneWidthStyle}>
                  <CardEditorPaneReadonlySurface
                    card={selectedCardEntity}
                    isFlipped={Boolean(isFlipped)}
                    onFlip={() => setIsFlipped((prev) => !prev)}
                    onToggleBookmark={handleToggleBookmark}
                    onToggleUncertainty={handleToggleUncertainty}
                    displayMode={displayMode}
                    cardLayoutMode={cardLayoutMode}
                    zoomScale={zoom}
                    fitScale={editorCardFitScale}
                  />
                </div>
              </div>
            )
          )}
        </CardWorkspaceShell>
        <CardEditorPaneMediaDialogs
          imageDialogSide={imageDialogSide}
          setImageDialogSide={setImageDialogSide}
          audioDialogSide={audioDialogSide}
          setAudioDialogSide={setAudioDialogSide}
          linkDialogSide={linkDialogSide}
          setLinkDialogSide={setLinkDialogSide}
          getDialogImages={getDialogImages}
          setDialogImages={setDialogImages}
          getDialogAudios={getDialogAudioUrls}
          setDialogAudios={setDialogAudios}
          getReferenceItems={getReferenceItems}
          setReferenceItems={setReferenceItems}
        />
      </>
    </BlockEditModeContext.Provider>
  );
};



const EditorSidePane = memo(EditorSidePaneInner, areEditorSidePanePropsEqual);
EditorSidePane.displayName = "EditorSidePane";

export { CardEditorPane };
