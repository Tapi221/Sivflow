import { ChevronLeft, ChevronRight, Minus, Plus, RefreshCw } from "@/ui/icons";
import { DragDropContext } from "@hello-pangea/dnd";
import React, { useEffect, useRef, useState } from "react";

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
import { LinkEditor } from "@/components/card/editor/LinkEditor";
import { useCardEditorContentController } from "@/components/card/editor/useCardEditorContentController";
import { useCardEditorSession } from "@/components/card/editor/useCardEditorSession";
import { useLayoutRowsController } from "@/components/card/editor/useLayoutRowsController";
import { CardCornerActions } from "@/components/card/frame/CardCornerActions";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { Flashcard } from "@/components/card/frame/Flashcard";
import MediaUploader from "@/components/card/media/MediaUploader";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/contexts/ToastContext";
import {
  DEFAULT_LAYOUT_ROWS,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";
import { useCards } from "@/hooks/card/useCards";
import { useTags } from "@/hooks/settings/useTags";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
import {
  createLatestReviewLogPatch,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";
import type { Card, UploadedImage, UserSettings } from "@/types";

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
  hideFooterActions?: boolean;
  embeddedInPager?: boolean;
  pairGapClassName?: string;
  onRequestCloseEditing?: () => void;
  highlightActiveCards?: boolean;
}

type UseCardsResult = {
  cards: Card[];
  updateCard: (cardId: string, data: unknown) => void | Promise<void>;
  createCard: (data: unknown) => unknown;
};

type FlashcardCardLike = Record<string, unknown> & {
  id?: string;
  title?: string;
  hasUncertainty?: boolean;
  isBookmarked?: boolean;
};

const CARDVIEW_SAVE_FINISHED_EVENT = "cardview:save-finished";
const CARDVIEW_EDITING_DRAFT_PATCH_EVENT = "cardview:editing-draft-patch";
const CARD_PANE_VIEW_DEFAULT_WIDTH_PX = 576;
const CARD_PANE_EDIT_DEFAULT_WIDTH_PX = 820;
const CARD_PANE_DOCKED_EDIT_DEFAULT_WIDTH_PX = 1000;
const CARD_PANE_VIEW_MIN_WIDTH_PX = 360;
const CARD_PANE_EDIT_MIN_WIDTH_PX = 640;
const CARD_PANE_WIDTH_STEP_PX = 40;
const CARD_PANE_AUTO_MAX_SCALE = 4;
const CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX = 72;
const CARD_EDITOR_PAIR_GAP_PX = 16;
const CARD_PAGER_EDIT_RULED_OFFSET_TOP_PX = 20;

function clampPaneWidthPx(
  value: number | null | undefined,
  min: number,
  max?: number,
): number {
  const fallback = Math.max(1, min);
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const clampedMin = Math.max(1, min);
  const clampedMax =
    typeof max === "number" && Number.isFinite(max)
      ? Math.max(clampedMin, max)
      : Number.POSITIVE_INFINITY;
  return Math.min(clampedMax, Math.max(clampedMin, Math.round(safeValue)));
}

interface CardPaneWidthControlProps {
  modeLabel: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onPreviewChange: (value: number) => void;
  onCommit: (value: number) => void;
  onStepDown: () => void;
  onStepUp: () => void;
  onReset: () => void;
}

function CardPaneWidthControl({
  modeLabel,
  value,
  min,
  max,
  defaultValue,
  onPreviewChange,
  onCommit,
  onStepDown,
  onStepUp,
  onReset,
}: CardPaneWidthControlProps) {
  const resetDisabled = value === defaultValue;
  const controlRootRef = React.useRef<HTMLDivElement | null>(null);
  const suppressOutsideClickUntilRef = React.useRef(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleClickCapture = (event: MouseEvent) => {
      if (Date.now() > suppressOutsideClickUntilRef.current) return;
      const target = event.target;
      if (
        target instanceof Node &&
        controlRootRef.current?.contains(target)
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("click", handleClickCapture, true);
    return () => {
      window.removeEventListener("click", handleClickCapture, true);
    };
  }, []);

  const beginInteractionGuard = () => {
    // スライダー操作の pointerup/click が背面のブロック追加ボタンに落ちる誤作動を抑止する。
    suppressOutsideClickUntilRef.current = Date.now() + 250;
  };

  return (
    <div
      ref={controlRootRef}
      className="pointer-events-auto flex items-center gap-1.5 rounded-[20px] border border-slate-200/80 bg-white/82 px-2.5 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
      onPointerDownCapture={beginInteractionGuard}
      onPointerMoveCapture={beginInteractionGuard}
    >
      <div className="min-w-[72px] leading-none">
        <div className="text-[10px] font-medium tracking-[0.06em] text-slate-500">
          {modeLabel}
        </div>
        <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-slate-700">
          {value}px
        </div>
      </div>

      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200/70 bg-white/55 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onStepDown}
        disabled={value <= min}
        aria-label={`${modeLabel}を縮小`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <div className="w-24 px-0.5">
        <Slider
          min={min}
          max={max}
          step={8}
          value={[value]}
          onValueChange={(next) => {
            const [raw] = next;
            onPreviewChange(clampPaneWidthPx(raw, min, max));
          }}
          onValueCommit={(next) => {
            const [raw] = next;
            onCommit(clampPaneWidthPx(raw, min, max));
          }}
          aria-label={`${modeLabel}スライダー`}
        />
      </div>

      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200/70 bg-white/55 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onStepUp}
        disabled={value >= max}
        aria-label={`${modeLabel}を拡大`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200/70 bg-white/55 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onReset}
        disabled={resetDisabled}
        aria-label={`${modeLabel}を既定値に戻す`}
        title="既定値に戻す"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const toFlashcardCardLike = (card: Card): FlashcardCardLike =>
  card as unknown as FlashcardCardLike;

type EditingDraftPatchDetail = {
  cardId: string;
  patch: Partial<Pick<Card, "title" | "isDraft">> & { tags?: string[] };
};

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
  hideFooterActions = false,
  embeddedInPager = false,
  pairGapClassName = "gap-6",
  onRequestCloseEditing,
  highlightActiveCards = false,
}: CardEditorPaneProps) {
  const { settings: settingsFromHook, updateSettings } = useUserSettings();
  const settings = settingsOverride ?? settingsFromHook;
  const { success: toastSuccess, error: toastError } = useToast();
  const { tagById, addTag } = useTags();
  const {
    cards: cardsFromHook,
    updateCard,
    createCard,
  } = useCards(folderId, cardSetId) as unknown as UseCardsResult;
  const cards = cardsOverride ?? cardsFromHook;

  const updateCardAsync = React.useCallback(
    async (id: string, data: Partial<Card>): Promise<unknown> => {
      return await Promise.resolve(updateCard(id, data));
    },
    [updateCard],
  );

  const createCardAsync = React.useCallback(
    async (data: Partial<Card>): Promise<unknown> => {
      return await Promise.resolve(createCard(data));
    },
    [createCard],
  );

  const [isMetaOpen, setIsMetaOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return (
      window.localStorage.getItem("card-editor.meta-panel-open") !== "false"
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "card-editor.meta-panel-open",
      String(isMetaOpen),
    );
  }, [isMetaOpen]);

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

  const resetDialogsRef = useRef<() => void>(() => {});

  const {
    draft,
    setDraft,
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
    handleSave,
    handleToggleBookmark,
    handleToggleUncertainty,
    handleUpdateTags,
    handleToggleDraft,
    handleTitleInputChange,
    handleUpdateTitle,
    panelCard,
  } = useCardEditorSession({
    selectedCardId,
    folderId,
    autoEdit,
    updateCard: updateCardAsync,
    createCard: createCardAsync,
    addTag,
    tagById,
    toastSuccess,
    toastError,
    onCardUpdated,
    onSelectCardId,
    resetDialogs: () => resetDialogsRef.current(),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EditingDraftPatchDetail>)?.detail;
      if (!detail || !selectedCard || !isEditing) return;
      if (detail.cardId !== selectedCard.id) return;

      const nextTitle =
        typeof detail.patch.title === "string" ? detail.patch.title : undefined;
      const nextIsDraft =
        typeof detail.patch.isDraft === "boolean"
          ? detail.patch.isDraft
          : undefined;
      const nextTags = Array.isArray(detail.patch.tags)
        ? detail.patch.tags
        : undefined;
      if (
        nextTitle === undefined &&
        nextIsDraft === undefined &&
        nextTags === undefined
      ) {
        return;
      }

      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(nextTitle !== undefined ? { title: nextTitle } : {}),
          ...(nextIsDraft !== undefined ? { isDraft: nextIsDraft } : {}),
          ...(nextTags !== undefined ? { tags: nextTags } : {}),
        };
      });
    };

    window.addEventListener(CARDVIEW_EDITING_DRAFT_PATCH_EVENT, handler);
    return () =>
      window.removeEventListener(CARDVIEW_EDITING_DRAFT_PATCH_EVENT, handler);
  }, [isEditing, selectedCard, setDraft]);

  const {
    allowAutoMinHeightSyncRef,
    manualResizeInProgressRef,
    scheduleLayoutRowsFromHeight,
    handleQuestionMinHeightChange,
    handleAnswerMinHeightChange,
  } = useLayoutRowsController({
    draft,
    setDraft,
    defaultLayoutRows: DEFAULT_LAYOUT_ROWS,
    normalizedSelectedCardId,
    isEditing,
  });

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
  } = useCardEditorContentController({
    draft,
    setDraft,
    allowAutoMinHeightSyncRef,
    resetDialogsRef,
  });

  const editorActionsTopLeft = selectedCard ? (
    <CardCornerActions
      onHelp={() => handleToggleUncertainty(selectedCard)}
      onStar={() => handleToggleBookmark(selectedCard)}
      helpActive={selectedCard.hasUncertainty ?? false}
      starActive={selectedCard.isBookmarked ?? false}
    />
  ) : undefined;

  const handleCancelEditing = React.useCallback(() => {
    handleCancel();
    onRequestCloseEditing?.();
  }, [handleCancel, onRequestCloseEditing]);

  const dispatchCardViewSaveFinished = React.useCallback((saved: boolean) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(CARDVIEW_SAVE_FINISHED_EVENT, { detail: { saved } }),
    );
  }, []);

  const handleSaveEditing = React.useCallback(async (): Promise<boolean> => {
    const saved = await handleSave();
    if (saved) {
      onRequestCloseEditing?.();
    }
    return saved;
  }, [handleSave, onRequestCloseEditing]);

  const prevSaveSignalRef = useRef<number | undefined>(saveSignal);
  useEffect(() => {
    if (saveSignal == null) return;
    if (prevSaveSignalRef.current === saveSignal) return;
    prevSaveSignalRef.current = saveSignal;
    if (!isEditing) {
      dispatchCardViewSaveFinished(true);
      return;
    }
    if (isSaving) return;
    void (async () => {
      const saved = await handleSave();
      dispatchCardViewSaveFinished(saved);
    })();
  }, [
    saveSignal,
    isEditing,
    isSaving,
    handleSave,
    dispatchCardViewSaveFinished,
  ]);

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
              onClick={() => setIsMetaOpen((prev) => !prev)}
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
                    ? "px-4 pt-0 pb-0"
                    : "px-4 pt-0 pb-4"
                : "p-4",
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
                          <div className="w-full">
                            <div
                              ref={setToolbarMountQInternal}
                              className="w-full"
                            />
                          </div>
                        ) : undefined
                      }
                      className={cn(
                        "premium-paper-depth",
                        "card-shell--paper",
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
                          <div className="w-full">
                            <div
                              ref={setToolbarMountAInternal}
                              className="w-full"
                            />
                          </div>
                        ) : undefined
                      }
                      className={cn(
                        "premium-paper-depth",
                        "card-shell--paper",
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
              onAddReviewLog={({ reviewedAt, rating, durationMinutes }) => {
                if (!selectedCard?.id) return Promise.resolve();
                const { patch } = createReviewPatchFromRating({
                  card: selectedCard,
                  rating,
                  now: new Date(reviewedAt),
                  delayBonusEnabled: settings?.delayBonusEnabled ?? false,
                  durationMinutes,
                });
                return Promise.resolve(updateCard(selectedCard.id, patch)).then(
                  () => {
                    onCardUpdated?.();
                  },
                );
              }}
              onUpdateLatestReviewLog={({
                reviewLogs,
                reviewedAt,
                rating,
                durationMinutes,
              }) => {
                if (!selectedCard?.id) return Promise.resolve();
                const { patch } = createLatestReviewLogPatch({
                  action: "update",
                  card: selectedCard,
                  delayBonusEnabled: settings?.delayBonusEnabled ?? false,
                  rating,
                  reviewedAt: new Date(reviewedAt),
                  reviewLogs,
                  reviewStartNextDay: settings?.reviewStartNextDay ?? true,
                  durationMinutes,
                });
                return Promise.resolve(updateCard(selectedCard.id, patch)).then(
                  () => {
                    onCardUpdated?.();
                  },
                );
              }}
              onDeleteLatestReviewLog={({ reviewLogs }) => {
                if (!selectedCard?.id) return Promise.resolve();
                const { patch } = createLatestReviewLogPatch({
                  action: "delete",
                  card: selectedCard,
                  delayBonusEnabled: settings?.delayBonusEnabled ?? false,
                  reviewLogs,
                  reviewStartNextDay: settings?.reviewStartNextDay ?? true,
                });
                return Promise.resolve(updateCard(selectedCard.id, patch)).then(
                  () => {
                    onCardUpdated?.();
                  },
                );
              }}
              onUpdateReviewLogDuration={({
                reviewLogs,
                logIndex,
                durationMinutes,
              }) => {
                if (!selectedCard?.id) return Promise.resolve();
                const nextReviewLogs = reviewLogs.map((log, index) =>
                  index === logIndex ? { ...log, durationMinutes } : log,
                );
                return Promise.resolve(
                  updateCard(selectedCard.id, {
                    reviewLogs: nextReviewLogs,
                  }),
                ).then(() => {
                  onCardUpdated?.();
                });
              }}
              onTitleInputChange={handleTitleInputChange}
              onUpdateTags={handleUpdateTags}
              onToggleDraft={handleToggleDraft}
              onUpdateTitle={handleUpdateTitle}
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
