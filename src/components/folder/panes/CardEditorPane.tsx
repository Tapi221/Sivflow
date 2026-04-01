import { ChevronLeft, ChevronRight } from "@/ui/icons";
import React, { memo, useCallback, useMemo, useState } from "react";

import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import { BlockEditModeContext } from "@/components/card/blocks/BlockWrapper";
import {
  CANONICAL_CARD_WIDTH,
  CARD_ROW_PX,
  layoutRowsToCardHeightPx,
} from "@/components/card/common/constants";
import {
  CardEditorLoadingState,
  EmptySelectionState,
  NewCardIdleState,
} from "@/components/card/editor/CardEditorPaneStates";
import { CardCornerActions } from "@/components/card/frame/CardCornerActions";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { CARD_SHELL_COMMON_CLASS_NAME } from "@/components/card/frame/cardShellClassNames";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import { CardEditorPaneMediaDialogs } from "@/components/folder/panes/CardEditorPaneMediaDialogs";
import { CardPaneWidthControl } from "@/components/folder/panes/CardPaneWidthControl";
import { useCardEditorPaneController } from "@/components/folder/panes/useCardEditorPaneController";
import {
  CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX,
  CARD_PANE_WIDTH_STEP_PX,
  useCardEditorPaneWidth,
} from "@/components/folder/panes/useCardEditorPaneWidth";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import { cn } from "@/lib/utils";
import type { Card, CardBlock, UserSettings } from "@/types/domain/card

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
  settingsOverride?: Partial<UserSettings> | null;
  saveSignal?: number;
  saveSignalEnabled?: boolean;
  hideFooterActions?: boolean;
  embeddedInPager?: boolean;
  pairGapClassName?: string;
  onRequestCloseEditing?: () => void;
  isPagerActiveCard?: boolean;
  isPagerInteractionCard?: boolean;
  showResizeHandle?: boolean;
}

type FlashcardCardLike = Record<string, unknown> & {
  id?: string;
  title?: string;
  hasUncertainty?: boolean;
  isBookmarked?: boolean;
};

const CARD_PANE_AUTO_MAX_SCALE = 4;
const CARD_EDITOR_PAIR_GAP_PX = 16;
const EMPTY_BLOCKS: CardBlock[] = [];

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
  shouldShowEditingBadge: boolean;
  isPagerActiveCard: boolean;
  enableBlockActiveState: boolean;
  showResizeHandle: boolean;
  editorCardFixedScale?: number;
  editorCardHeightPx: number;
  onHeightChange: (heightPx: number) => void;
  onMinHeightChange: (minHeightPx: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  actionsTopLeft?: React.ReactNode;
  actionsTopRight?: React.ReactNode;
};

function EditorSidePaneInner({
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
  hideCardShellHeader,
  shouldDockToolbarToCardTop,
  dockToolbarInsideCardEdge,
  setDockedToolbarMount,
  shouldShowEditingBadge,
  isPagerActiveCard,
  enableBlockActiveState,
  showResizeHandle,
  editorCardFixedScale,
  editorCardHeightPx,
  onHeightChange,
  onMinHeightChange,
  onResizeStart,
  onResizeEnd,
  actionsTopLeft,
  actionsTopRight,
}: EditorSidePaneProps) {
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
      <CardFrame
        baseWidth={CANONICAL_CARD_WIDTH}
        contentPaddingPx={0}
        allowUpscale
        maxScale={CARD_PANE_AUTO_MAX_SCALE}
        scaleMultiplier={1}
        fixedScale={editorCardFixedScale}
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
        className={cn(
          CARD_SHELL_COMMON_CLASS_NAME,
          shouldShowEditingBadge && "card-shell--editing",
          isPagerActiveCard && "card-shell--active",
        )}
        resizable
        showResizeHandle={showResizeHandle}
        resizeStepPx={CARD_ROW_PX}
        heightPx={editorCardHeightPx}
        lockHeight
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
        />
      </CardFrame>
    </div>
  );
}

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
  prev.shouldShowEditingBadge === next.shouldShowEditingBadge &&
  prev.isPagerActiveCard === next.isPagerActiveCard &&
  prev.enableBlockActiveState === next.enableBlockActiveState &&
  prev.editorCardFixedScale === next.editorCardFixedScale &&
  prev.editorCardHeightPx === next.editorCardHeightPx &&
  prev.actionsTopLeft === next.actionsTopLeft &&
  prev.actionsTopRight === next.actionsTopRight;

const EditorSidePane = memo(EditorSidePaneInner, areEditorSidePanePropsEqual);
EditorSidePane.displayName = "EditorSidePane";

const toFlashcardCardLike = (card: Card): FlashcardCardLike =>
  card as unknown as FlashcardCardLike;

export function CardEditorPane({
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
  saveSignal,
  saveSignalEnabled = true,
  hideFooterActions = false,
  embeddedInPager = false,
  pairGapClassName = "gap-6",
  onRequestCloseEditing,
  isPagerActiveCard = false,
  isPagerInteractionCard = isPagerActiveCard,
  showResizeHandle: showResizeHandleProp = true,
}: CardEditorPaneProps) {
  const controller = useCardEditorPaneController({
    selectedCardId,
    folderId,
    cardSetId,
    cardsOverride,
    autoEdit,
    onCardUpdated,
    onSelectCardId,
    onRequestCloseEditing,
    settingsOverride,
    saveSignal,
    saveSignalEnabled,
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
    isSaving,
    handleStartNew,
    handleCancel,
    handleToggleBookmark,
    handleToggleUncertainty,
    panelCard,
  } = session;

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
  const { handleCancelEditing, handleSaveEditing, metaPanel } = actions;

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

  const questionBlocks = draft?.questionBlocks ?? EMPTY_BLOCKS;
  const answerBlocks = draft?.answerBlocks ?? EMPTY_BLOCKS;

  const editorCardHeightPx = useMemo(
    () => layoutRowsToCardHeightPx(normalizeLayoutRows(draft?.layoutRows)),
    [draft?.layoutRows],
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
    shouldShowEditingBadge,
    useTwoColumnEditorLayout,
    editorCardFixedScale,
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
    isPagerActiveCard,
    isEditing,
    isMetaOpen,
    normalizedSelectedCardId,
    selectedCardId,
    canonicalCardWidth: CANONICAL_CARD_WIDTH,
    cardSetId,
  });

  const shouldKeepDockedToolbarInsideCard =
    shouldDockToolbarToCardTop && isMetaOpen && !embeddedInPager;

  const editorActionsTopLeft = useMemo(
    () =>
      selectedCard ? (
        <CardCornerActions
          onHelp={() => handleToggleUncertainty(selectedCard)}
          onStar={() => handleToggleBookmark(selectedCard)}
          helpActive={selectedCard.hasUncertainty ?? false}
          starActive={selectedCard.isBookmarked ?? false}
        />
      ) : undefined,
    [handleToggleBookmark, handleToggleUncertainty, selectedCard],
  );

  const questionBlocksForToolbar = draft?.questionBlocks;
  const questionImagesForToolbar = draft?.questionImages;
  const questionActionsTopRight = useMemo(
    () => {
      void questionBlocksForToolbar;
      void questionImagesForToolbar;
      return renderMediaDialogButtons("question");
    },
    [
      questionBlocksForToolbar,
      questionImagesForToolbar,
      renderMediaDialogButtons,
    ],
  );

  const answerBlocksForToolbar = draft?.answerBlocks;
  const answerImagesForToolbar = draft?.answerImages;
  const answerActionsTopRight = useMemo(
    () => {
      void answerBlocksForToolbar;
      void answerImagesForToolbar;
      return renderMediaDialogButtons("answer");
    },
    [
      answerBlocksForToolbar,
      answerImagesForToolbar,
      renderMediaDialogButtons,
    ],
  );

  if (!normalizedSelectedCardId && !isEditing) {
    return <EmptySelectionState onStartNew={handleStartNew} />;
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

  return (
    <BlockEditModeContext.Provider value={true}>
      <>
        <div
          className={cn(
            "pt-0 card-editor-right-pane-font",
            embeddedInPager ? "bg-transparent" : "bg-sidebar",
            embeddedInPager ? "pb-0" : "pb-4",
            embeddedInPager ? "h-auto" : "h-full",
          )}
        >
          <div
            className={cn(
              "relative flex",
              embeddedInPager
                ? "h-auto overflow-visible"
                : "h-full overflow-hidden",
            )}
          >
            {!hideMetaPanel && (
              <button
                type="button"
                className="absolute top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-[var(--sidebar-bg)] text-[#334155] surface-control-convex hover:bg-[var(--sidebar-active-bg)]"
                style={{
                  right: isMetaOpen
                    ? "calc(var(--ui-panel-width) - var(--ui-space-3))"
                    : "var(--ui-space-1)",
                  transform: "none",
                }}
                onClick={actions.toggleMetaOpen}
                aria-label={isMetaOpen ? "close meta panel" : "open meta panel"}
              >
                {isMetaOpen ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            )}

            {showWidthControl && (
              <div className="pointer-events-auto absolute left-3 top-2 z-30 flex">
                <CardPaneWidthControl
                  modeLabel={isEditing ? "編集幅" : "閲覧幅"}
                  value={activePaneWidthPx}
                  min={activePaneMinWidthPx}
                  max={activePaneMaxWidthPx}
                  defaultValue={activePaneDisplayedDefaultWidthPx}
                  onPreviewChange={(value) =>
                    previewPaneWidth(activePaneMode, value)
                  }
                  onCommit={(value) => {
                    void persistPaneWidth(activePaneMode, value);
                  }}
                  onStepDown={() => stepPaneWidth(-CARD_PANE_WIDTH_STEP_PX)}
                  onStepUp={() => stepPaneWidth(CARD_PANE_WIDTH_STEP_PX)}
                  onReset={resetActivePaneWidth}
                />
              </div>
            )}

            <div
              ref={contentViewportRef}
              className={cn(
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
              style={embeddedInPager ? undefined : { background: "#fafafa" }}
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
                  <div
                    className={cn(
                      "grid w-full max-w-full",
                      useTwoColumnEditorLayout ? "grid-cols-2" : "grid-cols-1",
                      pairGapClassName,
                    )}
                    style={{ columnGap: `${CARD_EDITOR_PAIR_GAP_PX}px` }}
                  >
                    <EditorSidePane
                      side="question"
                      blocks={questionBlocks}
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
                      dockToolbarInsideCardEdge={
                        shouldKeepDockedToolbarInsideCard
                      }
                      setDockedToolbarMount={setToolbarMountQInternal}
                      shouldShowEditingBadge={shouldShowEditingBadge}
                      isPagerActiveCard={isPagerActiveCard}
                      enableBlockActiveState={
                        !embeddedInPager || isPagerInteractionCard
                      }
                      showResizeHandle={showResizeHandleProp}
                      editorCardFixedScale={editorCardFixedScale}
                      editorCardHeightPx={editorCardHeightPx}
                      onHeightChange={handleEditorHeightChange}
                      onMinHeightChange={handleQuestionMinHeightChange}
                      onResizeStart={handleResizeStart}
                      onResizeEnd={handleResizeEnd}
                      actionsTopLeft={editorActionsTopLeft}
                      actionsTopRight={questionActionsTopRight}
                    />

                    <EditorSidePane
                      side="answer"
                      blocks={answerBlocks}
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
                      dockToolbarInsideCardEdge={
                        shouldKeepDockedToolbarInsideCard
                      }
                      setDockedToolbarMount={setToolbarMountAInternal}
                      shouldShowEditingBadge={shouldShowEditingBadge}
                      isPagerActiveCard={isPagerActiveCard}
                      enableBlockActiveState={
                        !embeddedInPager || isPagerInteractionCard
                      }
                      showResizeHandle={showResizeHandleProp}
                      editorCardFixedScale={editorCardFixedScale}
                      editorCardHeightPx={editorCardHeightPx}
                      onHeightChange={handleEditorHeightChange}
                      onMinHeightChange={handleAnswerMinHeightChange}
                      onResizeStart={handleResizeStart}
                      onResizeEnd={handleResizeEnd}
                      actionsTopLeft={editorActionsTopLeft}
                      actionsTopRight={answerActionsTopRight}
                    />
                  </div>

                  {!hideFooterActions && (
                    <div className="sticky bottom-4 flex w-full justify-end gap-2">
                      <button
                        type="button"
                        className="h-9 rounded-full px-4 hover:bg-black/5 disabled:opacity-50"
                        onClick={handleCancelEditing}
                        disabled={isSaving}
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        className="h-9 rounded-full bg-black px-6 text-white hover:opacity-90 disabled:opacity-50"
                        onClick={() => void handleSaveEditing()}
                        disabled={isSaving}
                      >
                        保存
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                selectedCard && (
                  <div className="flex w-full justify-center">
                    <div className="w-full" style={activePaneWidthStyle}>
                      <Flashcard
                        card={toFlashcardCardLike(selectedCard)}
                        isFlipped={isFlipped}
                        onFlip={() => setIsFlipped((prev) => !prev)}
                        onToggleBookmark={(cardLike) => {
                          if (!selectedCard) return;
                          void cardLike;
                          void handleToggleBookmark(selectedCard);
                        }}
                        onToggleUncertainty={(cardLike) => {
                          if (!selectedCard) return;
                          void cardLike;
                          void handleToggleUncertainty(selectedCard);
                        }}
                        onEdit={() => {
                          setIsFlipped(false);
                          setIsEditing(true);
                        }}
                        allowUpscale
                        maxScale={CARD_PANE_AUTO_MAX_SCALE}
                        scaleMultiplier={1}
                      />
                    </div>
                  </div>
                )
              )}
            </div>

            {!hideMetaPanel && isMetaOpen && (
              <CardMetaPanel
                card={panelCard}
                reviewLogs={panelCard?.reviewLogs ?? []}
                onAddReviewLog={metaPanel.onAddReviewLog}
                onUpdateLatestReviewLog={metaPanel.onUpdateLatestReviewLog}
                onDeleteLatestReviewLog={metaPanel.onDeleteLatestReviewLog}
                onUpdateReviewLogDuration={metaPanel.onUpdateReviewLogDuration}
                onTitleInputChange={metaPanel.onTitleInputChange}
                onUpdateTags={metaPanel.onUpdateTags}
                onToggleDraft={metaPanel.onToggleDraft}
                onUpdateTitle={metaPanel.onUpdateTitle}
                delayBonusEnabled={settings?.delayBonusEnabled ?? false}
                reviewStartNextDay={settings?.reviewStartNextDay ?? true}
              />
            )}
          </div>

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
        </div>
      </>
    </BlockEditModeContext.Provider>
  );
}
