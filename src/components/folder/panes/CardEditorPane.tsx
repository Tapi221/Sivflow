import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { BlockEditModeContext } from "@/components/card/blocks/core/BlockEditModeContext";
import { CardFaceWithAttachments } from "@/components/card/common/CardFaceWithAttachments";
import {
  CANONICAL_CARD_WIDTH,
  CARD_ROW_PX,
  layoutRowsToCardHeightPx,
} from "@constants/shared/flashcard";
import {
  CardEditorLoadingState,
  NewCardIdleState,
} from "@/components/card/editor/CardEditorPaneStates";
import { CardCornerActions } from "@/components/card/frame/CardCornerActions";
import { FaceSwitchBadge } from "@/components/card/frame/FaceSwitchBadge";
import { CardOverlayTopRight } from "@/components/card/frame/CardOverlayTopRight";
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
import { CardEditorPaneReadonlySurface } from "@/components/folder/panes/CardEditorPaneReadonlySurface";
import { useCardEditorPaneController } from "@/components/folder/panes/useCardEditorPaneController";
import {
  CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX,
  CARD_PANE_WIDTH_STEP_PX,
  useCardEditorPaneWidth,
} from "@/components/folder/panes/useCardEditorPaneWidth";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CardFaceScene } from "@/features/cardsetview/presentation/web/ui/components/CardFaceScene";
import { CardSurfaceLayout } from "@/features/cardsetview/presentation/web/ui/components/CardSurfaceLayout";
import {
  buildCardRenderSpec,
  resolveCardContentZoom,
  resolveCardSurfaceScale,
} from "@/features/cardrender/domain/cardRenderSpec";
import { cn } from "@/lib/utils";
import { CARD_PANE_AUTO_MAX_SCALE } from "@constants/shared/flashcard";
import type { Card, CardBlock, CardFaceAttachments } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import { toMillisOrNull } from "@/utils/toMillis";

/* full implementation intentionally mirrors current repo body with imports moved only */
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

type OverlayTopRightProps = Readonly<{
  children?: React.ReactNode;
}>;

const OverlayTopRight = ({ children }: OverlayTopRightProps) => {
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
  onActivate: () => void;
};

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
  onActivate,
}: EditorSidePaneProps) => {
  const frameClassName = cn(
    buildCardShellClassName(presentationState),
    displayMode === "fluid" &&
      "rounded-none border-none bg-transparent shadow-none",
  );

  const [internalToolbarMount, setInternalToolbarMount] =
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
          toolbarDesktopLayout: "vertical",
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
      onPointerDownCapture={onActivate}
      onFocusCapture={onActivate}
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
  const baseEditorContentZoom = resolveCardContentZoom(editorRenderSpec);

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
  const [globalBottomToolbarMount, setGlobalBottomToolbarMount] =
    useState<HTMLDivElement | null>(null);
  const [activeToolbarSide, setActiveToolbarSide] = useState<
    "question" | "answer"
  >("question");

  const toolbarMountQ = externalToolbarMountQ ?? toolbarMountQInternal;
  const toolbarMountA = externalToolbarMountA ?? toolbarMountAInternal;
  const usesExternalToolbarMount =
    Boolean(externalToolbarMountQ) && Boolean(externalToolbarMountA);

  const shouldUseGlobalBottomToolbar =
    isEditing &&
    !hideBlockToolbars;

  const shouldDockToolbarToCardTop = shouldUseGlobalBottomToolbar
    ? false
    : shouldDockToolbarToCardTopBase;

  const shouldShowInlineToolbarMount = shouldUseGlobalBottomToolbar
    ? false
    : shouldShowInlineToolbarMountBase;

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
    shouldDockToolbarToCardTop: shouldDockToolbarToCardTopBase,
    shouldShowInlineToolbarMount: shouldShowInlineToolbarMountBase,
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

  const isSplitEditorLayout =
    cardLayoutMode === "split" && useTwoColumnEditorLayout;

  useEffect(() => {
    if (cardLayoutMode !== "flip") return;

    setActiveToolbarSide(isFlipped ? "answer" : "question");
  }, [cardLayoutMode, isFlipped]);

  const editorContentZoom =
    isSplitEditorLayout && displayMode === "fluid"
      ? Math.max(0.1, baseEditorContentZoom / 2)
      : baseEditorContentZoom;

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
        onFlushAutosave={() => {
          void metaPanel.onFlushAutosave();
        }}
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
      attachments={frontAttachments}
      onBlocksChange={handleQuestionBlocksChange}
      label="問題"
      accentColor={editorAccentColor}
      duplicateToOpposite={editorDuplicateToOpposite}
      hideToolbar={
        hideBlockToolbars ||
        (shouldUseGlobalBottomToolbar && activeToolbarSide !== "question")
      }
      toolbarMount={
        shouldUseGlobalBottomToolbar && activeToolbarSide === "question"
          ? globalBottomToolbarMount
          : toolbarMountQ
      }
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
      frameFixedScale={editorFrameFixedScale}
      contentZoom={editorContentZoom}
      editorCardHeightPx={editorCardHeightPx}
      enableHeightResize={!isFluidEditor}
      onHeightChange={handleEditorHeightChange}
      onMinHeightChange={handleQuestionMinHeightChange}
      onResizeStart={handleResizeStart}
      onResizeEnd={handleResizeEnd}
      actionsTopLeft={editorActionsTopLeft}
      actionsTopRight={questionActionsTopRight}
      onActivate={() => setActiveToolbarSide("question")}
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
      hideToolbar={
        hideBlockToolbars ||
        (shouldUseGlobalBottomToolbar && activeToolbarSide !== "answer")
      }
      toolbarMount={
        shouldUseGlobalBottomToolbar && activeToolbarSide === "answer"
          ? globalBottomToolbarMount
          : toolbarMountA
      }
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
      frameFixedScale={editorFrameFixedScale}
      contentZoom={editorContentZoom}
      editorCardHeightPx={editorCardHeightPx}
      enableHeightResize={!isFluidEditor}
      onHeightChange={handleEditorHeightChange}
      onMinHeightChange={handleAnswerMinHeightChange}
      onResizeStart={handleResizeStart}
      onResizeEnd={handleResizeEnd}
      actionsTopLeft={editorActionsTopLeft}
      actionsTopRight={answerActionsTopRight}
      onActivate={() => setActiveToolbarSide("answer")}
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
        shouldUseGlobalBottomToolbar
          ? globalBottomToolbarMount
          : activeFlipSide === "question"
            ? toolbarMountQ
            : toolbarMountA
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
      frameFixedScale={editorFrameFixedScale}
      contentZoom={editorContentZoom}
      editorCardHeightPx={editorCardHeightPx}
      enableHeightResize={!isFluidEditor}
      onHeightChange={handleEditorHeightChange}
      onMinHeightChange={handleFlipMinHeightChange}
      onResizeStart={handleResizeStart}
      onResizeEnd={handleResizeEnd}
      actionsTopLeft={editorActionsTopLeft}
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
      onActivate={() => setActiveToolbarSide(activeFlipSide)}
    />
  );

  const editorPanelsNode = (
    <CardSurfaceLayout
      cardLayoutMode={
        cardLayoutMode === "flip"
          ? "flip"
          : isSplitEditorLayout
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
      className="inline-flex h-7 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 px-2 text-[10px] font-semibold leading-none text-slate-700 shadow-sm backdrop-blur-[2px] hover:bg-white"
      onClick={() => setIsEditing(true)}
    >
      編集
    </button>
  );

  return (
    <BlockEditModeContext.Provider value={true}>
      <>
        <CardWorkspaceShell
          containerClassName={cn(
            "card-editor-right-pane-font pt-0",
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
            embeddedInPager ? undefined : { background: "#fafafa" }
          }
          metaPanel={metaPanelNode}
        >
          {isEditing ? (
            <div
              className={cn(
                "flex w-full flex-col items-center gap-4",
                shouldUseGlobalBottomToolbar && "pb-28 md:pb-32",
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
            selectedCardEntity && (
              <div className="flex w-full justify-center">
                <div className="w-full space-y-2" style={activePaneWidthStyle}>
                  <div className="flex justify-end">{readonlyEditButton}</div>
                  <CardEditorPaneReadonlySurface
                    card={selectedCardEntity}
                    isFlipped={Boolean(isFlipped)}
                    onFlip={() => setIsFlipped((prev) => !prev)}
                    onToggleBookmark={handleToggleBookmark}
                    onToggleUncertainty={handleToggleUncertainty}
                    displayMode={displayMode}
                    cardLayoutMode={cardLayoutMode}
                    zoomScale={zoom}
                  />
                </div>
              </div>
            )
          )}
        </CardWorkspaceShell>

        {shouldUseGlobalBottomToolbar && typeof document !== "undefined"
          ? createPortal(
              <div className="pointer-events-none fixed left-1/2 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] z-[999] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 px-0">
                <div
                  className={cn(
                    "pointer-events-auto flex items-center gap-3 rounded-[28px] border",
                    "border-[rgba(148,163,184,0.24)]",
                    "bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,249,252,0.90))]",
                    "px-3 py-3 shadow-[0_20px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl",
                  )}
                >
                  {cardLayoutMode !== "flip" ? (
                    <div
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-[20px] border p-1",
                        "border-[rgba(148,163,184,0.18)] bg-white/72",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveToolbarSide("question")}
                        className={cn(
                          "inline-flex h-11 items-center rounded-2xl px-4 text-sm font-semibold transition-all",
                          activeToolbarSide === "question"
                            ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.22)]"
                            : "text-slate-500 hover:bg-white hover:text-slate-900",
                        )}
                      >
                        問題
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveToolbarSide("answer")}
                        className={cn(
                          "inline-flex h-11 items-center rounded-2xl px-4 text-sm font-semibold transition-all",
                          activeToolbarSide === "answer"
                            ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.22)]"
                            : "text-slate-500 hover:bg-white hover:text-slate-900",
                        )}
                      >
                        解答
                      </button>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "inline-flex h-11 shrink-0 items-center rounded-2xl border px-4 text-sm font-semibold",
                        "border-[rgba(148,163,184,0.18)] bg-white/72 text-slate-700",
                      )}
                    >
                      {activeFlipSide === "question" ? "問題" : "解答"}
                    </div>
                  )}

                  <div
                    className="h-8 w-px shrink-0 bg-slate-200/80"
                    aria-hidden
                  />
                  <div
                    ref={setGlobalBottomToolbarMount}
                    className="flex min-w-0 flex-1 items-center overflow-hidden"
                  />
                </div>
              </div>,
              document.body,
            )
          : null}

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
