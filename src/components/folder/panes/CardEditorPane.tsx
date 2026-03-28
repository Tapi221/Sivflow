import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { DragDropContext } from "@hello-pangea/dnd";
import React, { useRef, useState } from "react";

import { SharedCardContent } from "@/components/card/common/SharedCardContent";
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
import type { Card, UserSettings } from "@/types";

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
  highlightActiveCards?: boolean;
}

type FlashcardCardLike = Record<string, unknown> & {
  id?: string;
  title?: string;
  hasUncertainty?: boolean;
  isBookmarked?: boolean;
};

const CARD_PANE_AUTO_MAX_SCALE = 4;
const CARD_EDITOR_PAIR_GAP_PX = 16;
const CARD_PAGER_EDIT_RULED_OFFSET_TOP_PX = 20;

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
  highlightActiveCards = false,
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
  const { settings, updateSettings, isMetaOpen, session, layout, content, actions } =
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
    onDragEnd,
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
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const [contentViewportWidth, setContentViewportWidth] = useState<number>(
    () => (typeof window === "undefined" ? 1024 : window.innerWidth),
  );
  const [viewPaneWidthPx, setViewPaneWidthPx] = useState<number>(
    CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  );
  const [editPaneWidthPx, setEditPaneWidthPx] = useState<number>(
    dockToolbarsToTop
      ? CARD_PANE_DOCKED_EDIT_DEFAULT_WIDTH_PX
      : CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
  );

  const editorActionsTopLeft = selectedCard ? (
    <CardCornerActions
      onHelp={() => handleToggleUncertainty(selectedCard)}
      onStar={() => handleToggleBookmark(selectedCard)}
      helpActive={selectedCard.hasUncertainty ?? false}
      starActive={selectedCard.isBookmarked ?? false}
    />
  ) : undefined;

  const defaultEditPaneWidthPx = dockToolbarsToTop
    ? CARD_PANE_DOCKED_EDIT_DEFAULT_WIDTH_PX
    : CARD_PANE_EDIT_DEFAULT_WIDTH_PX;

  useEffect(() => {
    setViewPaneWidthPx(
      clampPaneWidthPx(
        settings?.cardViewPaneWidthPx ?? CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
        CARD_PANE_VIEW_MIN_WIDTH_PX,
      ),
    );
  }, [settings?.cardViewPaneWidthPx]);

  useEffect(() => {
    setEditPaneWidthPx(
      clampPaneWidthPx(
        settings?.cardEditPaneWidthPx ?? defaultEditPaneWidthPx,
        CARD_PANE_EDIT_MIN_WIDTH_PX,
      ),
    );
  }, [defaultEditPaneWidthPx, settings?.cardEditPaneWidthPx]);

  useEffect(() => {
    const element = contentViewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const nextWidth = Math.max(
        0,
        Math.round(
          Math.max(
            element.clientWidth,
            element.parentElement?.clientWidth ?? 0,
          ),
        ),
      );
      setContentViewportWidth((prev) =>
        prev === nextWidth ? prev : nextWidth,
      );
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [
    embeddedInPager,
    isEditing,
    isMetaOpen,
    normalizedSelectedCardId,
    selectedCard?.id,
  ]);

  const showWidthControl = !embeddedInPager;
  const activePaneMode = isEditing ? "edit" : "view";
  const activePaneMinWidthPx = isEditing
    ? CARD_PANE_EDIT_MIN_WIDTH_PX
    : CARD_PANE_VIEW_MIN_WIDTH_PX;
  const activePaneDefaultWidthPx = isEditing
    ? defaultEditPaneWidthPx
    : CARD_PANE_VIEW_DEFAULT_WIDTH_PX;
  const activeStoredPaneWidthPx = isEditing ? editPaneWidthPx : viewPaneWidthPx;
  const activePaneMaxWidthPx =
    contentViewportWidth > 0
      ? Math.max(activePaneMinWidthPx, contentViewportWidth)
      : activeStoredPaneWidthPx;
  const activePaneWidthPx = clampPaneWidthPx(
    activeStoredPaneWidthPx,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
  );
  const resolvedPaneWidthPx =
    typeof forcedPaneWidthPx === "number" && Number.isFinite(forcedPaneWidthPx)
      ? clampPaneWidthPx(forcedPaneWidthPx, activePaneMinWidthPx)
      : activePaneWidthPx;
  const activePaneDisplayedDefaultWidthPx = clampPaneWidthPx(
    activePaneDefaultWidthPx,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
  );
  const shouldReserveWidthControlSpace =
    showWidthControl && dockToolbarsToTop && !usesExternalToolbarMount;
  const hideCardShellHeader =
    embeddedInPager && dockToolbarsToTop;
  const shouldDockToolbarToCardTop =
    dockToolbarsToTop &&
    !hideBlockToolbars &&
    !usesExternalToolbarMount;
  const shouldShowInlineToolbarMount =
    !dockToolbarsToTop &&
    !hideBlockToolbars &&
    !usesExternalToolbarMount;
  const shouldShowEditingBadge = !embeddedInPager || highlightActiveCards;
  const shouldApplyPaneWidth =
    (showWidthControl && contentViewportWidth > 0) || forcedPaneWidthPx != null;
  const effectivePaneWidthPx = shouldApplyPaneWidth
    ? Math.max(
        activePaneMinWidthPx,
        Math.min(
          resolvedPaneWidthPx,
          contentViewportWidth > 0 ? contentViewportWidth : resolvedPaneWidthPx,
        ),
      )
    : Math.max(activePaneMinWidthPx, contentViewportWidth || activePaneMinWidthPx);
  const useTwoColumnEditorLayout = effectivePaneWidthPx >= 768;
  const editorCardTargetWidthPx = useTwoColumnEditorLayout
    ? Math.max(1, (effectivePaneWidthPx - CARD_EDITOR_PAIR_GAP_PX) / 2)
    : Math.max(1, effectivePaneWidthPx);
  const editorCardFixedScale = Math.max(
    0.1,
    Math.min(
      CARD_PANE_AUTO_MAX_SCALE,
      editorCardTargetWidthPx / Math.max(1, CANONICAL_CARD_WIDTH),
    ),
  );
  const activePaneWidthStyle = shouldApplyPaneWidth
    ? {
        width: `${resolvedPaneWidthPx}px`,
        maxWidth: "100%",
      }
    : undefined;

  const persistPaneWidth = React.useCallback(
    async (mode: "view" | "edit", widthPx: number) => {
      const minWidth =
        mode === "edit"
          ? CARD_PANE_EDIT_MIN_WIDTH_PX
          : CARD_PANE_VIEW_MIN_WIDTH_PX;
      const nextWidth = clampPaneWidthPx(widthPx, minWidth);
      if (mode === "edit") {
        setEditPaneWidthPx(nextWidth);
        await updateSettings({ cardEditPaneWidthPx: nextWidth });
        return;
      }
      setViewPaneWidthPx(nextWidth);
      await updateSettings({ cardViewPaneWidthPx: nextWidth });
    },
    [updateSettings],
  );

  const previewPaneWidth = React.useCallback(
    (mode: "view" | "edit", widthPx: number) => {
      const minWidth =
        mode === "edit"
          ? CARD_PANE_EDIT_MIN_WIDTH_PX
          : CARD_PANE_VIEW_MIN_WIDTH_PX;
      const nextWidth = clampPaneWidthPx(widthPx, minWidth);
      if (mode === "edit") {
        setEditPaneWidthPx(nextWidth);
        return;
      }
      setViewPaneWidthPx(nextWidth);
    },
    [],
  );

  const stepPaneWidth = React.useCallback(
    (deltaPx: number) => {
      const nextWidth = clampPaneWidthPx(
        activePaneWidthPx + deltaPx,
        activePaneMinWidthPx,
        activePaneMaxWidthPx,
      );
      void persistPaneWidth(activePaneMode, nextWidth);
    },
    [
      activePaneMaxWidthPx,
      activePaneMinWidthPx,
      activePaneMode,
      activePaneWidthPx,
      persistPaneWidth,
    ],
  );

  const resetActivePaneWidth = React.useCallback(() => {
    void persistPaneWidth(activePaneMode, activePaneDefaultWidthPx);
  }, [activePaneDefaultWidthPx, activePaneMode, persistPaneWidth]);

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
    <DragDropContext onDragEnd={onDragEnd}>
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
            <div className="pointer-events-none absolute left-3 top-2 z-30 flex">
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
              "min-w-0 flex-1 overflow-x-clip flex flex-col items-center",
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
                    "grid w-full max-w-full grid-cols-1 md:grid-cols-2",
                    pairGapClassName,
                  )}
                  style={{ columnGap: `${CARD_EDITOR_PAIR_GAP_PX}px` }}
                >
                  <div
                    className={cn(
                      "flex min-h-0 w-full flex-col",
                      shouldShowInlineToolbarMount ? "gap-2" : "gap-0",
                    )}
                  >
                    {shouldShowInlineToolbarMount && (
                      <div
                        ref={setToolbarMountQInternal}
                        className="w-full"
                      />
                      )}
                    <CardFrame
                      baseWidth={CANONICAL_CARD_WIDTH}
                      contentPaddingPx={0}
                      allowUpscale
                      maxScale={CARD_PANE_AUTO_MAX_SCALE}
                      scaleMultiplier={1}
                      ruledOffsetPx={
                        hideCardShellHeader
                          ? CARD_PAGER_EDIT_RULED_OFFSET_TOP_PX
                          : undefined
                      }
                      fixedScale={editorCardFixedScale}
                      topAttachment={
                        shouldDockToolbarToCardTop ? (
                          <div className="relative h-0 w-full overflow-visible pointer-events-none">
                            <div
                              ref={setToolbarMountQInternal}
                              className="absolute left-0 top-0 z-20 w-full pointer-events-auto"
                              style={{ transform: "translateY(-100%)" }}
                            />
                          </div>
                        ) : undefined
                      }
                      className={cn(
                        "premium-paper-depth",
                        "card-shell--paper",
                        shouldShowEditingBadge && "card-shell--editing",
                        highlightActiveCards && "card-shell--active-outline",
                      )}
                      resizable
                      showResizeHandle
                      resizeStepPx={CARD_ROW_PX}
                      heightPx={layoutRowsToCardHeightPx(
                        normalizeLayoutRows(draft?.layoutRows),
                      )}
                      lockHeight
                      onHeightChange={(heightPx) => {
                        void onDragEnd;
                        scheduleLayoutRowsFromHeight(heightPx);
                      }}
                      onMinHeightChange={handleQuestionMinHeightChange}
                      onResizeStart={() => {
                        manualResizeInProgressRef.current = true;
                      }}
                      onResizeEnd={() => {
                        manualResizeInProgressRef.current = false;
                      }}
                      actionsTopLeft={
                        hideCardShellHeader ? undefined : editorActionsTopLeft
                      }
                      actionsTopRight={
                        hideCardShellHeader
                          ? undefined
                          : renderMediaDialogButtons("question")
                      }
                    >
                      <SharedCardContent
                        mode="edit"
                        blocks={draft?.questionBlocks ?? []}
                        onChange={(blocks) => setSideBlocks("question", blocks)}
                        prefix="question"
                        label="問題"
                        color="text-indigo-500"
                        droppableId="question-blocks"
                        accentColor={settings?.accentColor}
                        duplicateToOpposite={settings?.duplicateToOpposite}
                        hideToolbar={hideBlockToolbars}
                        toolbarMount={toolbarMountQ}
                        settings={settings}
                      />
                    </CardFrame>
                  </div>

                  <div
                    className={cn(
                      "flex min-h-0 w-full flex-col",
                      shouldShowInlineToolbarMount ? "gap-2" : "gap-0",
                    )}
                  >
                    {shouldShowInlineToolbarMount && (
                      <div
                        ref={setToolbarMountAInternal}
                        className="w-full"
                      />
                      )}
                    <CardFrame
                      baseWidth={CANONICAL_CARD_WIDTH}
                      contentPaddingPx={0}
                      allowUpscale
                      maxScale={CARD_PANE_AUTO_MAX_SCALE}
                      scaleMultiplier={1}
                      ruledOffsetPx={
                        hideCardShellHeader
                          ? CARD_PAGER_EDIT_RULED_OFFSET_TOP_PX
                          : undefined
                      }
                      fixedScale={editorCardFixedScale}
                      topAttachment={
                        shouldDockToolbarToCardTop ? (
                          <div className="relative h-0 w-full overflow-visible pointer-events-none">
                            <div
                              ref={setToolbarMountAInternal}
                              className="absolute left-0 top-0 z-20 w-full pointer-events-auto"
                              style={{ transform: "translateY(-100%)" }}
                            />
                          </div>
                        ) : undefined
                      }
                      className={cn(
                        "premium-paper-depth",
                        "card-shell--paper",
                        shouldShowEditingBadge && "card-shell--editing",
                        highlightActiveCards && "card-shell--active-outline",
                      )}
                      resizable
                      showResizeHandle
                      resizeStepPx={CARD_ROW_PX}
                      heightPx={layoutRowsToCardHeightPx(
                        normalizeLayoutRows(draft?.layoutRows),
                      )}
                      lockHeight
                      onHeightChange={(heightPx) => {
                        void onDragEnd;
                        scheduleLayoutRowsFromHeight(heightPx);
                      }}
                      onMinHeightChange={handleAnswerMinHeightChange}
                      onResizeStart={() => {
                        manualResizeInProgressRef.current = true;
                      }}
                      onResizeEnd={() => {
                        manualResizeInProgressRef.current = false;
                      }}
                      actionsTopLeft={
                        hideCardShellHeader ? undefined : editorActionsTopLeft
                      }
                      actionsTopRight={
                        hideCardShellHeader
                          ? undefined
                          : renderMediaDialogButtons("answer")
                      }
                    >
                      <SharedCardContent
                        mode="edit"
                        blocks={draft?.answerBlocks ?? []}
                        onChange={(blocks) => setSideBlocks("answer", blocks)}
                        prefix="answer"
                        label="解答"
                        color="text-emerald-500"
                        droppableId="answer-blocks"
                        accentColor={settings?.accentColor}
                        duplicateToOpposite={settings?.duplicateToOpposite}
                        hideToolbar={hideBlockToolbars}
                        toolbarMount={toolbarMountA}
                        settings={settings}
                      />
                    </CardFrame>
                  </div>
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

        <Dialog
          modal={false}
          open={Boolean(imageDialogSide)}
          onOpenChange={(open) => !open && setImageDialogSide(null)}
        >
          <DialogContent nonModal className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>画像を追加</DialogTitle>
            </DialogHeader>
            {imageDialogSide && (
              <MediaUploader
                type="image"
                urls={getDialogImages(imageDialogSide)}
                onChange={(next) =>
                  setDialogImages(imageDialogSide, next as UploadedImage[])
                }
                maxFiles={10}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(audioDialogSide)}
          onOpenChange={(open) => !open && setAudioDialogSide(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>音声を追加</DialogTitle>
            </DialogHeader>
            {audioDialogSide && (
              <MediaUploader
                type="audio"
                urls={getDialogAudios(audioDialogSide)}
                onChange={(next) =>
                  setDialogAudios(audioDialogSide, next as unknown[])
                }
                maxFiles={10}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(linkDialogSide)}
          onOpenChange={(open) => !open && setLinkDialogSide(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>リンクを追加</DialogTitle>
            </DialogHeader>
            {linkDialogSide && (
              <LinkEditor
                items={getReferenceItems(linkDialogSide)}
                onChange={(next) => setReferenceItems(linkDialogSide, next)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DragDropContext>
  );
}
