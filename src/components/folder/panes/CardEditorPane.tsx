import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BlockEditModeContext } from "@/components/card/blocks/core/BlockEditModeContext";
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import {
  CANONICAL_CARD_WIDTH,
  CARD_ROW_PX,
  layoutRowsToCardHeightPx,
} from "@/components/card/common/constants";
import {
  CardEditorLoadingState,
  NewCardIdleState,
} from "@/components/card/editor/CardEditorPaneStates";
import { CardCornerActions } from "@/components/card/frame/CardCornerActions";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import {
  buildCardChromeClassName,
  buildCardShellClassName,
  resolveCardPresentationState,
  type CardPresentationContext,
  type CardPresentationContextInput,
  type CardPresentationState,
} from "@/components/card/presentation/cardPresentation";
import { CardSyncStatusPill } from "@/components/card/shell/CardSyncStatusPill";
import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import { CardWorkspaceShell } from "@/components/card/shell/CardWorkspaceShell";
import { CardEditorPaneMediaDialogs } from "@/components/folder/panes/CardEditorPaneMediaDialogs";
import { useCardEditorPaneController } from "@/components/folder/panes/useCardEditorPaneController";
import {
  CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX,
  CARD_PANE_WIDTH_STEP_PX,
  useCardEditorPaneWidth,
} from "@/components/folder/panes/useCardEditorPaneWidth";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import {
  buildCardRenderSpec,
  resolveCardContentZoom,
  resolveCardDisablesFrameScale,
  resolveCardSurfaceScale,
  resolveCardUsesStretchWidth,
} from "@/features/cardrender/domain/cardRenderSpec";
import { cn } from "@/lib/utils";
import type { Card, CardBlock } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";

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

type FlashcardCardLike = Record<string, unknown> & {
  id?: string;
  title?: string;
  hasUncertainty?: boolean;
  isBookmarked?: boolean;
};

const CARD_PANE_AUTO_MAX_SCALE = 4;
const CARD_EDITOR_PAIR_GAP_PX = 0;
const EMPTY_BLOCKS: CardBlock[] = [];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCardEntity = (value: unknown): value is Card =>
  isRecord(value) && typeof value.id === "string";

const toFlashcardCardLike = (card: unknown): FlashcardCardLike =>
  (isRecord(card) ? card : {}) as FlashcardCardLike;

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

type EditorSidePaneProps = {
  side: "question" | "answer";
  blocks: CardBlock[];
  onBlocksChange: (blocks: CardBlock[]) => void;
  selectionScopeKey: string | null;
  label: string;
  color: string;
  droppableId: string;
  accentColor?: string;
  duplicateToOpposite?: boolean;
  hideToolbar: boolean;
  toolbarMount: HTMLDivElement | null;
  settings: unknown;
  shouldShowInlineToolbarMount: boolean;
  setInlineToolbarMount: (value: HTMLDivElement | null) => void;
  hideCardShellHeader: boolean;
  shouldDockToolbarToCardTop: boolean;
  dockToolbarInsideCardEdge: boolean;
  setDockedToolbarMount: (value: HTMLDivElement | null) => void;
  presentationState: CardPresentationState;
  enableBlockActiveState: boolean;
  showResizeHandle: boolean;
  displayMode: CardDisplayMode;
  frameFixedScale?: number;
  frameDisableScale: boolean;
  frameStretchWidth: boolean;
  frameRuled: boolean;
  contentZoom: number;
  editorCardHeightPx: number | null;
  enableHeightResize: boolean;
  onHeightChange: (heightPx: number) => void;
  onMinHeightChange: (minHeightPx: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  actionsTopLeft?: React.ReactNode;
  actionsTopRight?: React.ReactNode;
};

const EditorSidePaneInner = ({
  side,
  blocks,
  onBlocksChange,
  selectionScopeKey,
  label,
  color,
  droppableId,
  accentColor,
  duplicateToOpposite,
  hideToolbar,
  toolbarMount,
  settings,
  shouldShowInlineToolbarMount,
  setInlineToolbarMount,
  hideCardShellHeader: _hideCardShellHeader,
  shouldDockToolbarToCardTop,
  dockToolbarInsideCardEdge,
  setDockedToolbarMount,
  presentationState,
  enableBlockActiveState,
  showResizeHandle,
  displayMode,
  frameFixedScale,
  frameDisableScale,
  frameStretchWidth,
  frameRuled,
  contentZoom,
  editorCardHeightPx,
  enableHeightResize,
  onHeightChange,
  onMinHeightChange,
  onResizeStart,
  onResizeEnd,
  actionsTopLeft,
  actionsTopRight,
}: EditorSidePaneProps) => {
  void _hideCardShellHeader;

  const frameClassName = cn(
    buildCardShellClassName(presentationState),
    displayMode === "fluid" &&
      "rounded-none border-none bg-transparent shadow-none",
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
        <div
          className={cn(
            buildCardChromeClassName(presentationState),
            "inline-block max-w-full align-top text-left",
          )}
        >
          <CardFrame
            baseWidth={CANONICAL_CARD_WIDTH}
            contentPaddingPx={0}
            allowUpscale
            maxScale={CARD_PANE_AUTO_MAX_SCALE}
            scaleMultiplier={1}
            fixedScale={frameFixedScale}
            disableScale={frameDisableScale}
            stretchWidth={frameStretchWidth}
            topAttachment={
              shouldDockToolbarToCardTop ? (
                <div className="relative h-0 w-full overflow-visible pointer-events-none">
                  <div
                    ref={setDockedToolbarMount}
                    className={cn(
                      "absolute top-0 z-20 pointer-events-auto",
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
              ) : undefined
            }
            className={frameClassName}
            ruled={frameRuled}
            resizable={enableHeightResize}
            showResizeHandle={enableHeightResize && showResizeHandle}
            resizeStepPx={enableHeightResize ? CARD_ROW_PX : undefined}
            heightPx={enableHeightResize ? editorCardHeightPx : null}
            lockHeight={enableHeightResize}
            onHeightChange={onHeightChange}
            onMinHeightChange={onMinHeightChange}
            onResizeStart={onResizeStart}
            onResizeEnd={onResizeEnd}
            actionsTopLeft={actionsTopLeft}
            actionsTopRight={actionsTopRight}
          >
            <SharedCardContent
              mode="edit"
              blocks={blocks}
              onChange={onBlocksChange}
              selectionScopeKey={selectionScopeKey}
              prefix={side}
              label={label}
              color={color}
              droppableId={droppableId}
              accentColor={accentColor}
              duplicateToOpposite={duplicateToOpposite}
              hideToolbar={hideToolbar}
              toolbarMount={toolbarMount}
              toolbarDesktopLayout="vertical"
              enableBlockActiveState={enableBlockActiveState}
              settings={settings}
              displayMode={displayMode}
              zoom={contentZoom}
            />
          </CardFrame>
        </div>
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
  prev.selectionScopeKey === next.selectionScopeKey &&
  prev.label === next.label &&
  prev.color === next.color &&
  prev.droppableId === next.droppableId &&
  prev.accentColor === next.accentColor &&
  prev.duplicateToOpposite === next.duplicateToOpposite &&
  prev.hideToolbar === next.hideToolbar &&
  prev.toolbarMount === next.toolbarMount &&
  prev.settings === next.settings &&
  prev.shouldShowInlineToolbarMount === next.shouldShowInlineToolbarMount &&
  prev.hideCardShellHeader === next.hideCardShellHeader &&
  prev.shouldDockToolbarToCardTop === next.shouldDockToolbarToCardTop &&
  prev.dockToolbarInsideCardEdge === next.dockToolbarInsideCardEdge &&
  prev.presentationState.isActiveCard === next.presentationState.isActiveCard &&
  prev.presentationState.isInteractiveCard ===
    next.presentationState.isInteractiveCard &&
  prev.presentationState.showEditingOutline ===
    next.presentationState.showEditingOutline &&
  prev.presentationState.showActiveChrome ===
    next.presentationState.showActiveChrome &&
  prev.enableBlockActiveState === next.enableBlockActiveState &&
  prev.showResizeHandle === next.showResizeHandle &&
  prev.displayMode === next.displayMode &&
  prev.frameFixedScale === next.frameFixedScale &&
  prev.frameDisableScale === next.frameDisableScale &&
  prev.frameStretchWidth === next.frameStretchWidth &&
  prev.frameRuled === next.frameRuled &&
  prev.contentZoom === next.contentZoom &&
  prev.editorCardHeightPx === next.editorCardHeightPx &&
  prev.enableHeightResize === next.enableHeightResize &&
  prev.actionsTopLeft === next.actionsTopLeft &&
  prev.actionsTopRight === next.actionsTopRight;

const EditorSidePane = memo(EditorSidePaneInner, areEditorSidePanePropsEqual);
EditorSidePane.displayName = "EditorSidePane";

export const CardEditorPane = ({
  selectedCardId,
  folderId,
  cardSetId,
  forcedPaneWidthPx = null,
  cardsOverride,
  autoEdit,
  onCardUpdated,
  onSelectCardId,
  hideMetaPanel = false,
  dockToolbarsToTop = false,
  hideBlockToolbars = false,
  externalToolbarMountQ = null,
  externalToolbarMountA = null,
  settingsOverride = null,
  embeddedInPager = false,
  pairGapClassName = "gap-0",
  presentationContext,
  showResizeHandle: showResizeHandleProp = true,
  onSyncStatusChange,
  overlayTopInsetPx = 0,
  displayMode = "fixed",
  cardLayoutMode = "split",
  zoom = 1,
}: CardEditorPaneProps) => {
  const controller = useCardEditorPaneController({
    selectedCardId,
    folderId,
    cardSetId,
    cardsOverride,
    autoEdit,
    onCardUpdated,
    onSelectCardId,
    settingsOverride,
  });

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
  const [flipEditingSide, setFlipEditingSide] =
    useState<"question" | "answer">("question");

  useEffect(() => {
    if (saveError) {
      setShowRetryErrorState(true);
      return;
    }

    if (!isRetryingSync) {
      setShowRetryErrorState(false);
    }
  }, [isRetryingSync, saveError]);

  useEffect(() => {
    setFlipEditingSide("question");
  }, [cardLayoutMode, normalizedSelectedCardId]);

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

  const editorRenderSpec = useMemo(
    () =>
      buildCardRenderSpec({
        displayMode,
        interactionMode: "edit",
        zoomScale: zoom,
        showInk: false,
      }),
    [displayMode, zoom],
  );

  const isFluidEditor = editorRenderSpec.surfaceMode === "fluid";
  const editorContentZoom = resolveCardContentZoom(editorRenderSpec);
  const editorFrameDisableScale =
    resolveCardDisablesFrameScale(editorRenderSpec);
  const editorFrameStretchWidth = resolveCardUsesStretchWidth(editorRenderSpec);

  const {
    manualResizeInProgressRef,
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
    manualResizeInProgressRef.current = true;
  }, [manualResizeInProgressRef]);

  const handleResizeEnd = useCallback(() => {
    manualResizeInProgressRef.current = false;
  }, [manualResizeInProgressRef]);

  const {
    contentViewportRef,
    showWidthControl,
    activePaneMode,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
    activePaneWidthPx,
    activePaneDisplayedDefaultWidthPx,
    shouldReserveWidthControlSpace,
    hideCardShellHeader,
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
  });

  const activePaneModeValue: "edit" | "view" =
    activePaneMode === "edit" ? "edit" : "view";

  const shouldKeepDockedToolbarInsideCard =
    shouldDockToolbarToCardTop && isMetaOpen && !embeddedInPager;

  const selectedCardEntity = isCardEntity(selectedCard) ? selectedCard : null;
  const panelCardEntity = isCardEntity(panelCard) ? panelCard : null;
  const flashcardCard = selectedCard ? toFlashcardCardLike(selectedCard) : null;

  const editorFrameFixedScale = useMemo(() => {
    if (isFluidEditor) return undefined;

    return Math.max(
      0.1,
      Math.min(
        CARD_PANE_AUTO_MAX_SCALE,
        editorCardFitScale * resolveCardSurfaceScale(editorRenderSpec),
      ),
    );
  }, [editorCardFitScale, editorRenderSpec, isFluidEditor]);

  const fallbackLastSyncedAtMs = useMemo(() => {
    return (
      lastSavedAt?.getTime() ??
      toTimeMs(
        (selectedCardEntity as { updatedAt?: unknown } | null)?.updatedAt,
      ) ??
      toTimeMs(
        (selectedCardEntity as { createdAt?: unknown } | null)?.createdAt,
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

  useEffect(() => {
    if (!onSyncStatusChange) return;
    onSyncStatusChange(syncStatus);

    return () => {
      onSyncStatusChange(null);
    };
  }, [onSyncStatusChange, syncStatus]);

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

  const editorActionsTopLeft = useMemo(
    () =>
      selectedCardEntity ? (
        <CardCornerActions
          onHelp={() => handleToggleUncertainty(selectedCardEntity)}
          onStar={() => handleToggleBookmark(selectedCardEntity)}
          helpActive={selectedCardEntity.hasUncertainty ?? false}
          starActive={selectedCardEntity.isBookmarked ?? false}
        />
      ) : undefined,
    [handleToggleBookmark, handleToggleUncertainty, selectedCardEntity],
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

  const metaPanelNode =
    !hideMetaPanel && isMetaOpen ? (
      <CardMetaPanel
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
        onFlushAutosave={metaPanel.onFlushAutosave}
        onTitleInputChange={metaPanel.onTitleInputChange}
        onUpdateTags={metaPanel.onUpdateTags}
        onToggleDraft={metaPanel.onToggleDraft}
        onUpdateTitle={metaPanel.onUpdateTitle}
        delayBonusEnabled={settings?.delayBonusEnabled ?? false}
        reviewStartNextDay={settings?.reviewStartNextDay ?? true}
      />
    ) : null;

  const syncStatusRight = hideMetaPanel
    ? "calc(var(--ui-space-1) + 2.75rem)"
    : isMetaOpen
      ? "calc(var(--ui-panel-width) + 2.75rem)"
      : "calc(var(--ui-space-1) + 2.75rem)";

  const syncStatusOverlay = !embeddedInPager ? (
    <div
      className="pointer-events-none absolute z-20 flex"
      style={{
        top: `${overlayTopInsetPx + 12}px`,
        right: syncStatusRight,
        transform: "none",
      }}
    >
      <CardSyncStatusPill
        lastSyncedAtMs={syncStatus.lastSyncedAtMs}
        hasError={syncStatus.hasError}
        isRetrying={syncStatus.isRetrying}
        canRetry={syncStatus.retry != null}
        onRetry={syncStatus.retry ?? undefined}
      />
    </div>
  ) : null;

  const questionEditorPane = (
    <EditorSidePane
      side="question"
      blocks={frontBlocks}
      onBlocksChange={handleQuestionBlocksChange}
      selectionScopeKey={normalizedSelectedCardId}
      label="問題"
      color="text-indigo-500"
      droppableId="question-blocks"
      accentColor={settings?.accentColor}
      duplicateToOpposite={settings?.duplicateToOpposite}
      hideToolbar={hideBlockToolbars}
      toolbarMount={toolbarMountQ}
      settings={settings}
      shouldShowInlineToolbarMount={shouldShowInlineToolbarMount}
      setInlineToolbarMount={setToolbarMountQInternal}
      hideCardShellHeader={hideCardShellHeader}
      shouldDockToolbarToCardTop={shouldDockToolbarToCardTop}
      dockToolbarInsideCardEdge={shouldKeepDockedToolbarInsideCard}
      setDockedToolbarMount={setToolbarMountQInternal}
      presentationState={cardPresentationState}
      enableBlockActiveState={cardPresentationState.isInteractiveCard}
      showResizeHandle={showResizeHandleProp}
      displayMode={displayMode}
      frameFixedScale={editorFrameFixedScale}
      frameDisableScale={editorFrameDisableScale}
      frameStretchWidth={editorFrameStretchWidth}
      frameRuled={!isFluidEditor}
      contentZoom={editorContentZoom}
      editorCardHeightPx={editorCardHeightPx}
      enableHeightResize={!isFluidEditor}
      onHeightChange={handleEditorHeightChange}
      onMinHeightChange={handleQuestionMinHeightChange}
      onResizeStart={handleResizeStart}
      onResizeEnd={handleResizeEnd}
      actionsTopLeft={editorActionsTopLeft}
      actionsTopRight={questionActionsTopRight}
    />
  );

  const answerEditorPane = (
    <EditorSidePane
      side="answer"
      blocks={backBlocks}
      onBlocksChange={handleAnswerBlocksChange}
      selectionScopeKey={normalizedSelectedCardId}
      label="解答"
      color="text-emerald-500"
      droppableId="answer-blocks"
      accentColor={settings?.accentColor}
      duplicateToOpposite={settings?.duplicateToOpposite}
      hideToolbar={hideBlockToolbars}
      toolbarMount={toolbarMountA}
      settings={settings}
      shouldShowInlineToolbarMount={shouldShowInlineToolbarMount}
      setInlineToolbarMount={setToolbarMountAInternal}
      hideCardShellHeader={hideCardShellHeader}
      shouldDockToolbarToCardTop={shouldDockToolbarToCardTop}
      dockToolbarInsideCardEdge={shouldKeepDockedToolbarInsideCard}
      setDockedToolbarMount={setToolbarMountAInternal}
      presentationState={cardPresentationState}
      enableBlockActiveState={cardPresentationState.isInteractiveCard}
      showResizeHandle={showResizeHandleProp}
      displayMode={displayMode}
      frameFixedScale={editorFrameFixedScale}
      frameDisableScale={editorFrameDisableScale}
      frameStretchWidth={editorFrameStretchWidth}
      frameRuled={!isFluidEditor}
      contentZoom={editorContentZoom}
      editorCardHeightPx={editorCardHeightPx}
      enableHeightResize={!isFluidEditor}
      onHeightChange={handleEditorHeightChange}
      onMinHeightChange={handleAnswerMinHeightChange}
      onResizeStart={handleResizeStart}
      onResizeEnd={handleResizeEnd}
      actionsTopLeft={editorActionsTopLeft}
      actionsTopRight={answerActionsTopRight}
    />
  );

  const splitEditorColumnsClassName =
    useTwoColumnEditorLayout && cardLayoutMode === "split"
      ? "grid-cols-2"
      : "grid-cols-1";

  const editorPanelsNode =
    cardLayoutMode === "flip" ? (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/85 p-1 shadow-sm">
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              flipEditingSide === "question"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
            onClick={() => setFlipEditingSide("question")}
          >
            問題
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              flipEditingSide === "answer"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
            onClick={() => setFlipEditingSide("answer")}
          >
            解答
          </button>
        </div>

        <div
          className={cn("grid w-full max-w-full grid-cols-1", pairGapClassName)}
          style={{ columnGap: `${CARD_EDITOR_PAIR_GAP_PX}px` }}
        >
          {flipEditingSide === "question"
            ? questionEditorPane
            : answerEditorPane}
        </div>
      </div>
    ) : (
      <div
        className={cn(
          "grid w-full max-w-full",
          splitEditorColumnsClassName,
          pairGapClassName,
        )}
        style={{ columnGap: `${CARD_EDITOR_PAIR_GAP_PX}px` }}
      >
        {questionEditorPane}
        {answerEditorPane}
      </div>
    );

  return (
    <BlockEditModeContext.Provider value={true}>
      <>
        <CardWorkspaceShell
          containerClassName={cn(
            "pt-0 card-editor-right-pane-font",
            embeddedInPager ? "bg-transparent" : "bg-sidebar",
            embeddedInPager ? "pb-0" : "pb-4",
            embeddedInPager ? "h-auto" : "h-full",
          )}
          shellClassName={cn(
            embeddedInPager
              ? "h-auto overflow-visible"
              : "h-full overflow-hidden",
          )}
          widthControl={widthControlProps}
          overlayChildren={syncStatusOverlay}
          overlayTopInsetPx={overlayTopInsetPx}
          isMetaOpen={isMetaOpen}
          onToggleMetaOpen={hideMetaPanel ? undefined : actions.toggleMetaOpen}
          hideMetaToggle={hideMetaPanel}
          viewportRef={contentViewportRef}
          viewportClassName={cn(
            "min-w-0 flex-1 flex flex-col items-center",
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
            embeddedInPager ? undefined : { background: "#fafafa" }
          }
          metaPanel={metaPanelNode}
        >
          {isEditing ? (
            <div
              className={cn(
                "flex w-full flex-col items-center gap-4",
                embeddedInPager &&
                  forcedPaneWidthPx == null &&
                  (dockToolbarsToTop ? "max-w-[1000px]" : "max-w-[820px]"),
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
            flashcardCard && (
              <div className="flex w-full justify-center">
                <div className="w-full" style={activePaneWidthStyle}>
                  <Flashcard
                    card={flashcardCard}
                    isFlipped={isFlipped}
                    onFlip={() => setIsFlipped((prev) => !prev)}
                    onToggleBookmark={(cardLike) => {
                      void cardLike;
                      if (!selectedCardEntity) return;
                      void handleToggleBookmark(selectedCardEntity);
                    }}
                    onToggleUncertainty={(cardLike) => {
                      void cardLike;
                      if (!selectedCardEntity) return;
                      void handleToggleUncertainty(selectedCardEntity);
                    }}
                    onEdit={() => {
                      setIsFlipped(false);
                      setIsEditing(true);
                    }}
                    displayMode={displayMode}
                    allowUpscale
                    maxScale={CARD_PANE_AUTO_MAX_SCALE}
                    scaleMultiplier={1}
                    fixedScale={editorFrameFixedScale}
                    contentZoom={editorContentZoom}
                    cardShellClassName={
                      displayMode === "fluid"
                        ? "border-none bg-transparent shadow-none"
                        : undefined
                    }
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
          getDialogAudios={getDialogAudios}
          setDialogAudios={setDialogAudios}
          getReferenceItems={getReferenceItems}
          setReferenceItems={setReferenceItems}
        />
      </>
    </BlockEditModeContext.Provider>
  );
};
