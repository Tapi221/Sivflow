import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import {
  CANONICAL_CARD_WIDTH,
  layoutRowsToCardHeightPx,
} from "@/components/card/common/constants";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import { CardEditorPane } from "@/components/folder/panes/CardEditorPane";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { CardCarousel3D } from "@/features/review/CardCarousel3D";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import { useCardEntity } from "@/hooks/card/useCardEntity";
import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useFolders } from "@/hooks/folder/useFolders";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { normalizeLayoutRows } from "@/domain/card/extraRows";
import {
  createLatestReviewLogPatch,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";
import type { Card } from "@/types";
import { ChevronLeft, ChevronRight, Minus, Plus, RefreshCw } from "@/ui/icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const CARDVIEW_PAGER_PADDING_INLINE = 16;
const CARDVIEW_PAGER_PADDING_BLOCK = "50vh";
const CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS = 0;
const CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS = 16;
const EDIT_PREVIEW_RANGE = 2;
const CARDVIEW_SAVE_FINISHED_EVENT = "cardview:save-finished";
const CARD_PANE_VIEW_DEFAULT_WIDTH_PX = 576;
const CARD_PANE_EDIT_DEFAULT_WIDTH_PX = 1000;
const CARD_PANE_VIEW_MIN_WIDTH_PX = 360;
const CARD_PANE_EDIT_MIN_WIDTH_PX = 640;
const CARD_PANE_WIDTH_STEP_PX = 40;
const CARD_PANE_AUTO_MAX_SCALE = 4;
const CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX = 72;

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

  return (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-[20px] border border-slate-200/80 bg-white/82 px-2.5 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
      <div className="min-w-[72px] leading-none">
        <div className="text-[10px] font-medium tracking-[0.06em] text-slate-500">
          {modeLabel}
        </div>
        <div className="mt-1 text-[13px] font-semibold tabular-nums text-slate-700">
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

type ParsedParams = {
  folderId: string | null;
  cardSetId: string | null;
  initialIndex: number;
  targetCardId: string | null;
};

function parseCardViewParams(): ParsedParams {
  if (typeof window === "undefined") {
    return {
      folderId: null,
      cardSetId: null,
      initialIndex: 0,
      targetCardId: null,
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get("folderId");
  const cardSetId = urlParams.get("cardSetId");
  const initialIndexRaw = Number.parseInt(urlParams.get("index") || "0", 10);
  const targetCardId = urlParams.get("cardId");

  return {
    folderId,
    cardSetId,
    initialIndex:
      Number.isFinite(initialIndexRaw) && initialIndexRaw >= 0
        ? initialIndexRaw
        : 0,
    targetCardId,
  };
}

interface DesktopCardSurfaceProps {
  card: Card;
  isActive: boolean;
  isGlobalEditing: boolean;
  showEditPreview: boolean;
  editPaneWidthPx: number;
  isFlipped: boolean;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride: Card[];
  saveSignal: number;
  globalToolbarMountQ: HTMLDivElement | null;
  globalToolbarMountA: HTMLDivElement | null;
  onFlip: () => void;
  onEdit: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
}

const DesktopCardSurface = React.memo(function DesktopCardSurface({
  card,
  isActive,
  isGlobalEditing,
  showEditPreview,
  editPaneWidthPx,
  isFlipped,
  folderId,
  cardSetId,
  cardsOverride,
  saveSignal,
  globalToolbarMountQ,
  globalToolbarMountA,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: DesktopCardSurfaceProps) {
  if (isGlobalEditing) {
    if (!isActive) {
      if (showEditPreview) {
        const previewHeightPx = layoutRowsToCardHeightPx(
          normalizeLayoutRows(card.layoutRows),
        );
        return (
          <div className="w-full overflow-visible">
            <div
              className="mx-auto w-full pointer-events-none select-none"
              style={{ width: `${editPaneWidthPx}px`, maxWidth: "100%" }}
            >
              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                <CardFrame
                  baseWidth={CANONICAL_CARD_WIDTH}
                  contentPaddingPx={0}
                  allowUpscale
                  maxScale={CARD_PANE_AUTO_MAX_SCALE}
                  scaleMultiplier={1}
                  className="premium-paper-depth card-shell--paper"
                  resizable={false}
                  showResizeHandle={false}
                  heightPx={previewHeightPx}
                  lockHeight
                >
                  <SharedCardContent
                    mode="view"
                    blocks={card.questionBlocks ?? []}
                  />
                </CardFrame>
                <CardFrame
                  baseWidth={CANONICAL_CARD_WIDTH}
                  contentPaddingPx={0}
                  allowUpscale
                  maxScale={CARD_PANE_AUTO_MAX_SCALE}
                  scaleMultiplier={1}
                  className="premium-paper-depth card-shell--paper"
                  resizable={false}
                  showResizeHandle={false}
                  heightPx={previewHeightPx}
                  lockHeight
                >
                  <SharedCardContent
                    mode="view"
                    blocks={card.answerBlocks ?? []}
                  />
                </CardFrame>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div
          className="w-full overflow-visible"
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "900px 1200px",
          }}
        >
          <div className="h-[900px] w-full" />
        </div>
      );
    }

    return (
      <div className="w-full overflow-visible">
        <CardEditorPane
          selectedCardId={card.id}
          folderId={folderId || undefined}
          cardSetId={cardSetId || undefined}
          forcedPaneWidthPx={editPaneWidthPx}
          cardsOverride={cardsOverride}
          autoEdit
          hideMetaPanel
          dockToolbarsToTop
          hideBlockToolbars={false}
          saveSignal={saveSignal}
          hideFooterActions
          embeddedInPager
          externalToolbarMountQ={globalToolbarMountQ}
          externalToolbarMountA={globalToolbarMountA}
          pairGapClassName="gap-4"
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-visible">
      <Flashcard
        card={card}
        isFlipped={isActive ? isFlipped : false}
        onFlip={isActive ? onFlip : undefined}
        onEdit={isActive ? onEdit : undefined}
        onToggleUncertainty={isActive ? onToggleUncertainty : undefined}
        onToggleBookmark={isActive ? onToggleBookmark : undefined}
        allowUpscale
        maxScale={CARD_PANE_AUTO_MAX_SCALE}
        scaleMultiplier={1}
      />
    </div>
  );
});

export default function CardView() {
  const { setExtraCrumbs } = useBreadcrumbContext();
  const lastCrumbsSignatureRef = useRef<string>("");

  const initialParamsRef = useRef<ParsedParams>(parseCardViewParams());
  const { folderId, cardSetId, initialIndex, targetCardId } =
    initialParamsRef.current;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);
  const pendingExitAfterSaveRef = useRef(false);
  const pendingCreateCardAfterSaveRef = useRef(false);
  const pendingFocusCardIdRef = useRef<string | null>(null);
  const suppressPagerSyncRef = useRef(false);
  const lockedIndexRef = useRef<number | null>(null);
  const [globalToolbarMountQ, setGlobalToolbarMountQ] =
    useState<HTMLDivElement | null>(null);
  const [globalToolbarMountA, setGlobalToolbarMountA] =
    useState<HTMLDivElement | null>(null);
  const [isMetaOpen, setIsMetaOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("card-view.meta-panel-open") !== "false";
  });

  const {
    cards = [],
    loading: isLoading,
    createCard,
    updateCard,
  } = useCards(folderId || undefined, cardSetId || undefined);
  const { cardSets } = useCardSets();
  const { folders = [] } = useFolders();
  const { settings, updateSettings } = useUserSettings();
  const { error: toastError } = useToast();
  const isDesktop = useIsDesktopRuntime();
  const autoInitializedCardSetIdsRef = useRef<Set<string>>(new Set());
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const [contentViewportWidth, setContentViewportWidth] = useState<number>(
    () => (typeof window === "undefined" ? 1024 : window.innerWidth),
  );
  const [viewPaneWidthPx, setViewPaneWidthPx] = useState<number>(
    CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  );
  const [editPaneWidthPx, setEditPaneWidthPx] = useState<number>(
    CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "card-view.meta-panel-open",
      String(isMetaOpen),
    );
  }, [isMetaOpen]);

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
        settings?.cardEditPaneWidthPx ?? CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
        CARD_PANE_EDIT_MIN_WIDTH_PX,
      ),
    );
  }, [settings?.cardEditPaneWidthPx]);

  useEffect(() => {
    const element = contentViewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const nextWidth = Math.max(0, Math.round(element.clientWidth));
      setContentViewportWidth((prev) =>
        prev === nextWidth ? prev : nextWidth,
      );
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isDesktop, isGlobalEditing, isMetaOpen, currentIndex]);

  const activePaneMode = isGlobalEditing ? "edit" : "view";
  const activePaneMinWidthPx = isGlobalEditing
    ? CARD_PANE_EDIT_MIN_WIDTH_PX
    : CARD_PANE_VIEW_MIN_WIDTH_PX;
  const activePaneDefaultWidthPx = isGlobalEditing
    ? CARD_PANE_EDIT_DEFAULT_WIDTH_PX
    : CARD_PANE_VIEW_DEFAULT_WIDTH_PX;
  const activePaneStoredWidthPx = isGlobalEditing
    ? editPaneWidthPx
    : viewPaneWidthPx;
  const activePaneMaxWidthPx =
    contentViewportWidth > 0
      ? Math.max(activePaneMinWidthPx, contentViewportWidth)
      : activePaneStoredWidthPx;
  const activePaneWidthPx = clampPaneWidthPx(
    activePaneStoredWidthPx,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
  );
  const activePaneDisplayedDefaultWidthPx = clampPaneWidthPx(
    activePaneDefaultWidthPx,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
  );
  const showWidthControl = isDesktop;
  const shouldReserveWidthControlSpace = showWidthControl && isGlobalEditing;

  const persistPaneWidth = useCallback(
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

  const previewPaneWidth = useCallback(
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

  const stepPaneWidth = useCallback(
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

  const resetActivePaneWidth = useCallback(() => {
    void persistPaneWidth(activePaneMode, activePaneDefaultWidthPx);
  }, [activePaneDefaultWidthPx, activePaneMode, persistPaneWidth]);

  const sortedCards = useMemo(() => {
    return [...cards].sort(
      (a, b) =>
        (a.orderIndex ?? a.order_index ?? 0) -
        (b.orderIndex ?? b.order_index ?? 0),
    );
  }, [cards]);

  const cardIndexById = useMemo(() => {
    const map = new Map<string, number>();
    sortedCards.forEach((card, index) => {
      map.set(card.id, index);
    });
    return map;
  }, [sortedCards]);

  useEffect(() => {
    if (!targetCardId || sortedCards.length === 0) return;
    const foundIndex = cardIndexById.get(targetCardId);
    if (typeof foundIndex === "number") {
      setCurrentIndex(foundIndex);
    }
  }, [targetCardId, sortedCards.length, cardIndexById]);

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const safeCurrentIndex = useMemo(() => {
    if (sortedCards.length === 0) return 0;
    return Math.min(Math.max(currentIndex, 0), sortedCards.length - 1);
  }, [currentIndex, sortedCards.length]);

  useEffect(() => {
    if (safeCurrentIndex !== currentIndex) {
      setCurrentIndex(safeCurrentIndex);
    }
  }, [safeCurrentIndex, currentIndex]);

  const currentCard = sortedCards[safeCurrentIndex] ?? null;
  const { effectiveCard } = useCardEntity(currentCard?.id);

  const selectedCard = useMemo(() => {
    if (!currentCard) return null;
    if (effectiveCard && effectiveCard.id === currentCard.id) {
      return effectiveCard;
    }
    return currentCard;
  }, [currentCard, effectiveCard]);

  const cardsForPager = useMemo(() => {
    if (!selectedCard) return sortedCards;
    const next = sortedCards.slice();
    const selectedIndex = next.findIndex((card) => card.id === selectedCard.id);
    if (selectedIndex >= 0) {
      next[selectedIndex] = selectedCard;
    }
    return next;
  }, [sortedCards, selectedCard]);

  const selectedCardSet = useMemo(() => {
    if (!cardSetId) return null;
    return cardSets.find((set) => set.id === cardSetId) ?? null;
  }, [cardSetId, cardSets]);

  const createAndFocusCard = useCallback(async (): Promise<boolean> => {
    const targetCardSetId =
      cardSetId ?? selectedCard?.cardSetId ?? currentCard?.cardSetId ?? null;
    const targetFolderId =
      folderId ??
      selectedCardSet?.folderId ??
      selectedCard?.folderId ??
      currentCard?.folderId ??
      "";

    if (!targetCardSetId) {
      toastError("新規カードの追加先カードセットが見つかりません");
      return false;
    }

    try {
      setIsFlipped(false);
      setIsGlobalEditing(true);

      const created = await createCard({
        cardSetId: targetCardSetId,
        folderId: targetFolderId,
      });
      const createdId =
        (typeof created === "object" &&
          created !== null &&
          "id" in created &&
          typeof (created as { id?: unknown }).id === "string" &&
          (created as { id: string }).id) ||
        (typeof created === "string" ? created : null);

      if (!createdId) {
        toastError("新規カードの作成結果を取得できませんでした");
        return false;
      }

      pendingFocusCardIdRef.current = createdId;
      return true;
    } catch (error) {
      console.error("[CardView] Failed to create new card:", error);
      toastError(
        error instanceof Error ? error.message : "新規カードの作成に失敗しました",
      );
      return false;
    }
  }, [
    cardSetId,
    createCard,
    currentCard?.cardSetId,
    currentCard?.folderId,
    folderId,
    selectedCard?.cardSetId,
    selectedCard?.folderId,
    selectedCardSet?.folderId,
    toastError,
  ]);

  useEffect(() => {
    if (!cardSetId || isLoading) return;
    if (sortedCards.length > 0) return;
    if (autoInitializedCardSetIdsRef.current.has(cardSetId)) return;
    autoInitializedCardSetIdsRef.current.add(cardSetId);

    setIsGlobalEditing(true);
    const targetFolderId = folderId ?? selectedCardSet?.folderId ?? "";

    void (async () => {
      try {
        const created = await createCard({
          cardSetId,
          folderId: targetFolderId,
        });
        const createdId =
          (typeof created === "object" &&
            created !== null &&
            "id" in created &&
            typeof (created as { id?: unknown }).id === "string" &&
            (created as { id: string }).id) ||
          (typeof created === "string" ? created : null);

        if (createdId) {
          pendingFocusCardIdRef.current = createdId;
        }
      } catch (error) {
        console.error("[CardView] Failed to bootstrap empty card set:", error);
      }
    })();
  }, [
    cardSetId,
    createCard,
    folderId,
    isLoading,
    selectedCardSet?.folderId,
    sortedCards.length,
  ]);

  useEffect(() => {
    const crumbs: Array<{
      label: string;
      to?: string;
      folderId?: string | null;
    }> = [];

    const crumbFolderId = folderId ?? selectedCardSet?.folderId ?? null;
    if (crumbFolderId) {
      const path = [];
      let cur = folders.find((f) => f.id === crumbFolderId);
      while (cur) {
        path.unshift(cur);
        cur = folders.find((f) => f.id === cur.parentFolderId);
      }

      path.forEach((folder) => {
        crumbs.push({
          label: folder.folderName,
          to: `/folders?folderId=${folder.id}`,
          folderId: folder.id,
        });
      });
    }

    if (selectedCardSet) {
      const to = new URLSearchParams();
      if (crumbFolderId) to.set("folderId", crumbFolderId);
      to.set("cardSetId", selectedCardSet.id);
      crumbs.push({
        label: selectedCardSet.name || "カードセット",
        to: `/folders?${to.toString()}`,
        folderId: crumbFolderId,
      });
    }

    if (selectedCard) {
      const label =
        selectedCard.title?.trim() ||
        selectedCard.questionText?.trim().slice(0, 20) ||
        "カード";
      crumbs.push({ label });
    }

    const signature = JSON.stringify(crumbs);
    if (lastCrumbsSignatureRef.current !== signature) {
      lastCrumbsSignatureRef.current = signature;
      setExtraCrumbs(crumbs);
    }
  }, [selectedCardSet, selectedCard, folderId, folders, setExtraCrumbs]);

  useEffect(() => {
    return () => {
      lastCrumbsSignatureRef.current = "";
      setExtraCrumbs([]);
    };
  }, [setExtraCrumbs]);

  const handleEdit = useCallback(() => {
    setIsGlobalEditing(true);
  }, []);

  const handleToggleUncertainty = useCallback(
    async (card: Card) => {
      const current = card.hasUncertainty ?? card.has_uncertainty ?? false;
      await updateCard(card.id, { hasUncertainty: !current });
    },
    [updateCard],
  );

  const handleToggleBookmark = useCallback(
    async (card: Card) => {
      const current = card.isBookmarked ?? card.is_bookmarked ?? false;
      await updateCard(card.id, { isBookmarked: !current });
    },
    [updateCard],
  );

  const handleToggleViewMode = useCallback(() => {
    const targetId = selectedCard?.id ?? null;
    pendingFocusCardIdRef.current = targetId;
    suppressPagerSyncRef.current = true;
    lockedIndexRef.current =
      targetId != null ? (cardIndexById.get(targetId) ?? null) : null;
    setIsFlipped(false);

    if (isGlobalEditing) {
      pendingExitAfterSaveRef.current = true;
      setSaveSignal((prev) => prev + 1);
      return;
    }

    setIsGlobalEditing(true);
  }, [selectedCard?.id, cardIndexById, isGlobalEditing]);

  useEffect(() => {
    const targetId = pendingFocusCardIdRef.current;
    if (!targetId) return;

    const nextIndex = cardIndexById.get(targetId);
    if (typeof nextIndex === "number") {
      setCurrentIndex(nextIndex);
      lockedIndexRef.current = nextIndex;
    }

    pendingFocusCardIdRef.current = null;

    const timer = window.setTimeout(() => {
      suppressPagerSyncRef.current = false;
      lockedIndexRef.current = null;
    }, 220);

    return () => window.clearTimeout(timer);
  }, [isGlobalEditing, cardIndexById]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("cardview:editing-change", { detail: isGlobalEditing }),
    );
  }, [isGlobalEditing]);

  useEffect(() => {
    const onToggleEditingRequest = () => {
      handleToggleViewMode();
    };

    window.addEventListener(
      "cardview:toggle-editing-request",
      onToggleEditingRequest,
    );

    return () => {
      window.removeEventListener(
        "cardview:toggle-editing-request",
        onToggleEditingRequest,
      );
    };
  }, [handleToggleViewMode]);

  useEffect(() => {
    const onCreateCardRequest = () => {
      pendingExitAfterSaveRef.current = false;

      if (isGlobalEditing) {
        pendingCreateCardAfterSaveRef.current = true;
        setSaveSignal((prev) => prev + 1);
        return;
      }

      void createAndFocusCard();
    };

    window.addEventListener("cardview:create-card-request", onCreateCardRequest);

    return () => {
      window.removeEventListener(
        "cardview:create-card-request",
        onCreateCardRequest,
      );
    };
  }, [createAndFocusCard, isGlobalEditing]);

  useEffect(() => {
    const onSaveRequest = () => {
      if (isGlobalEditing) {
        pendingExitAfterSaveRef.current = true;
      }
      setSaveSignal((prev) => prev + 1);
    };

    window.addEventListener("cardview:save-request", onSaveRequest);

    return () => {
      window.removeEventListener("cardview:save-request", onSaveRequest);
    };
  }, [isGlobalEditing]);

  useEffect(() => {
    const onSaveFinished = (event: Event) => {
      const saved = Boolean(
        (event as CustomEvent<{ saved?: boolean }>)?.detail?.saved,
      );

      if (pendingCreateCardAfterSaveRef.current) {
        pendingCreateCardAfterSaveRef.current = false;
        if (!saved) return;
        void createAndFocusCard();
        return;
      }

      if (!pendingExitAfterSaveRef.current) return;
      if (!saved) {
        pendingExitAfterSaveRef.current = false;
        return;
      }

      pendingExitAfterSaveRef.current = false;
      setIsGlobalEditing(false);
    };

    window.addEventListener(CARDVIEW_SAVE_FINISHED_EVENT, onSaveFinished);

    return () => {
      window.removeEventListener(CARDVIEW_SAVE_FINISHED_EVENT, onSaveFinished);
    };
  }, [createAndFocusCard]);

  const handlePagerIndexChange = useCallback((idx: number) => {
    if (
      suppressPagerSyncRef.current &&
      lockedIndexRef.current != null &&
      idx !== lockedIndexRef.current
    ) {
      return;
    }
    setCurrentIndex(idx);
  }, []);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const renderDesktopCard = useCallback(
    (card: Card, idx: number, isActive: boolean) => {
      const showEditPreview =
        Math.abs(idx - safeCurrentIndex) <= EDIT_PREVIEW_RANGE;
      return (
        <DesktopCardSurface
          card={card}
          isActive={isActive}
          isGlobalEditing={isGlobalEditing}
          showEditPreview={showEditPreview}
          editPaneWidthPx={editPaneWidthPx}
          isFlipped={isFlipped}
          folderId={folderId}
          cardSetId={cardSetId}
          cardsOverride={cardsForPager}
          saveSignal={saveSignal}
          globalToolbarMountQ={globalToolbarMountQ}
          globalToolbarMountA={globalToolbarMountA}
          onFlip={handleFlip}
          onEdit={handleEdit}
          onToggleUncertainty={handleToggleUncertainty}
          onToggleBookmark={handleToggleBookmark}
        />
      );
    },
    [
      isGlobalEditing,
      isFlipped,
      folderId,
      cardSetId,
      cardsForPager,
      saveSignal,
      globalToolbarMountQ,
      globalToolbarMountA,
      handleFlip,
      handleEdit,
      handleToggleUncertainty,
      handleToggleBookmark,
      safeCurrentIndex,
      editPaneWidthPx,
    ],
  );

  if (!folderId && !cardSetId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          フォルダまたはカードセットが指定されていません
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-[#F5F7F8] pt-0 card-editor-right-pane-font">
      <div className="relative flex h-full min-h-0 overflow-hidden">
        {showWidthControl && (
          <div className="pointer-events-none absolute left-3 top-3 z-30 hidden md:flex">
            <CardPaneWidthControl
              modeLabel={isGlobalEditing ? "編集幅" : "閲覧幅"}
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

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute top-3 z-20 h-8 w-8 rounded-full bg-[var(--sidebar-bg)] text-[#334155] surface-control-convex hover:bg-[var(--sidebar-active-bg)]"
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
        </Button>

        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          style={
            shouldReserveWidthControlSpace
              ? { paddingTop: CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX }
              : undefined
          }
        >
          {isDesktop && isGlobalEditing && (
            <div className="shrink-0 border-b border-gray-200/70 bg-[#F8FAFB] px-3 py-2">
              <div
                className="mx-auto grid w-full grid-cols-1 gap-4 md:grid-cols-2"
                style={{ width: `${editPaneWidthPx}px`, maxWidth: "100%" }}
              >
                <div
                  className={`flex h-14 min-h-0 w-full items-center rounded-md ${
                    isGlobalEditing
                      ? "border border-slate-100 bg-white/60"
                      : "border border-transparent bg-transparent"
                  }`}
                >
                  <div ref={setGlobalToolbarMountQ} className="w-full" />
                </div>
                <div
                  className={`flex h-14 min-h-0 w-full items-center rounded-md ${
                    isGlobalEditing
                      ? "border border-slate-100 bg-white/60"
                      : "border border-transparent bg-transparent"
                  }`}
                >
                  <div ref={setGlobalToolbarMountA} className="w-full" />
                </div>
              </div>
            </div>
          )}

          <div
            ref={contentViewportRef}
            className={`min-h-0 min-w-0 flex-1 overflow-hidden py-0 ${
              isGlobalEditing ? "px-0" : "px-4"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="space-y-4 w-full max-w-md px-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-[400px] w-full" />
                </div>
              </div>
            ) : isDesktop ? (
              <VerticalCardPager
                cards={cardsForPager}
                activeIndex={safeCurrentIndex}
                onActiveIndexChange={handlePagerIndexChange}
                onFlip={handleFlip}
                paddingInlinePx={CARDVIEW_PAGER_PADDING_INLINE}
                paddingBlock={CARDVIEW_PAGER_PADDING_BLOCK}
                naturalIndexCommitDelayMs={
                  isGlobalEditing
                    ? CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS
                    : CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS
                }
                getCardWidth={() => activePaneWidthPx}
                getKey={(card) => card.id ?? card.docId ?? card.uid}
                renderCard={renderDesktopCard}
              />
            ) : (
              <CardCarousel3D
                cards={cardsForPager}
                syncIndex={safeCurrentIndex}
                onIndexChange={setCurrentIndex}
                renderCenter={(card, idx) => (
                  <MobileScalableCard
                    cardDesignWidth={CANONICAL_CARD_WIDTH}
                    safePadding={0}
                  >
                    <Flashcard
                      card={card}
                      isFlipped={isFlipped}
                      onFlip={handleFlip}
                      onEdit={handleEdit}
                      onToggleUncertainty={handleToggleUncertainty}
                      onToggleBookmark={handleToggleBookmark}
                      onPrev={() => idx > 0 && setCurrentIndex(idx - 1)}
                      onNext={() =>
                        idx < cardsForPager.length - 1 &&
                        setCurrentIndex(idx + 1)
                      }
                      hasNext={idx < cardsForPager.length - 1}
                      hasPrev={idx > 0}
                      currentIndex={idx}
                      totalCards={cardsForPager.length}
                      editorSharedHeightPx={
                        settings?.cardEditorHeightPx ?? null
                      }
                    />
                  </MobileScalableCard>
                )}
                renderPreview={(card) => (
                  <MobileScalableCard
                    cardDesignWidth={CANONICAL_CARD_WIDTH}
                    safePadding={0}
                  >
                    <Flashcard
                      card={card}
                      isFlipped={false}
                      previewMode={true}
                    />
                  </MobileScalableCard>
                )}
              />
            )}
          </div>
        </div>

        {isMetaOpen && (
          <div className="hidden h-full min-h-0 shrink-0 md:block">
            <CardMetaPanel
              card={selectedCard}
              reviewLogs={selectedCard?.reviewLogs ?? []}
              onAddReviewLog={({ reviewedAt, rating }) => {
                if (!selectedCard?.id) return Promise.resolve();
                const { patch } = createReviewPatchFromRating({
                  card: selectedCard,
                  rating,
                  now: new Date(reviewedAt),
                  delayBonusEnabled: settings?.delayBonusEnabled ?? false,
                });
                return updateCard(selectedCard.id, patch);
              }}
              onUpdateLatestReviewLog={({ reviewLogs, reviewedAt, rating }) => {
                if (!selectedCard?.id) return Promise.resolve();
                const { patch } = createLatestReviewLogPatch({
                  action: "update",
                  card: selectedCard,
                  delayBonusEnabled: settings?.delayBonusEnabled ?? false,
                  rating,
                  reviewedAt: new Date(reviewedAt),
                  reviewLogs,
                  reviewStartNextDay: settings?.reviewStartNextDay ?? true,
                });
                return updateCard(selectedCard.id, patch);
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
                return updateCard(selectedCard.id, patch);
              }}
              onUpdateTags={(nextTags) => {
                if (!selectedCard?.id) return;
                void updateCard(selectedCard.id, { tags: nextTags });
              }}
              onToggleDraft={(nextDraft) => {
                if (!selectedCard?.id) return;
                void updateCard(selectedCard.id, { isDraft: nextDraft });
              }}
              delayBonusEnabled={settings?.delayBonusEnabled ?? false}
              reviewStartNextDay={settings?.reviewStartNextDay ?? true}
              onUpdateTitle={(nextTitle) => {
                if (!selectedCard?.id) return;
                void updateCard(selectedCard.id, { title: nextTitle });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
