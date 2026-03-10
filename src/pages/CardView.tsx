import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import { CardEditorPane } from "@/components/folder/panes/CardEditorPane";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { CardCarousel3D } from "@/features/review/CardCarousel3D";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import { useCardEntity } from "@/hooks/card/useCardEntity";
import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import type { Card } from "@/types";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const CARDVIEW_PAGER_PADDING_INLINE = 16;
const CARDVIEW_PAGER_PADDING_BLOCK = "50vh";

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
    initialIndex: Number.isFinite(initialIndexRaw) && initialIndexRaw >= 0
      ? initialIndexRaw
      : 0,
    targetCardId,
  };
}

interface DesktopCardSurfaceProps {
  card: Card;
  isActive: boolean;
  isGlobalEditing: boolean;
  isFlipped: boolean;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride: Card[];
  saveSignal: number;
  globalToolbarMountQ: HTMLDivElement | null;
  globalToolbarMountA: HTMLDivElement | null;
  editorSharedHeightPx: number | null;
  onFlip: () => void;
  onEdit: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
}

const DesktopCardSurface = React.memo(function DesktopCardSurface({
  card,
  isActive,
  isGlobalEditing,
  isFlipped,
  folderId,
  cardSetId,
  cardsOverride,
  saveSignal,
  globalToolbarMountQ,
  globalToolbarMountA,
  editorSharedHeightPx,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: DesktopCardSurfaceProps) {
  if (isGlobalEditing) {
    if (!isActive) {
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
      <div
        className="w-full overflow-visible"
        style={{
          contentVisibility: "auto",
          containIntrinsicSize: "900px 1200px",
        }}
      >
        <CardEditorPane
          selectedCardId={card.id}
          folderId={folderId || undefined}
          cardSetId={cardSetId || undefined}
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
    <MobileScalableCard
      cardDesignWidth={CANONICAL_CARD_WIDTH}
      safePadding={0}
    >
      <Flashcard
        card={card}
        isFlipped={isActive ? isFlipped : false}
        onFlip={isActive ? onFlip : undefined}
        onEdit={isActive ? onEdit : undefined}
        onToggleUncertainty={isActive ? onToggleUncertainty : undefined}
        onToggleBookmark={isActive ? onToggleBookmark : undefined}
        editorSharedHeightPx={editorSharedHeightPx}
      />
    </MobileScalableCard>
  );
});

export default function CardView() {
  const { setExtraCrumbs } = useBreadcrumbContext();

  const initialParamsRef = useRef<ParsedParams>(parseCardViewParams());
  const { folderId, cardSetId, initialIndex, targetCardId } =
    initialParamsRef.current;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);
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
    updateCard,
  } = useCards(folderId || undefined, cardSetId || undefined);
  const { cardSets } = useCardSets();
  const { settings } = useUserSettings();
  const isDesktop = useIsDesktopRuntime();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("card-view.meta-panel-open", String(isMetaOpen));
  }, [isMetaOpen]);

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

  useEffect(() => {
    const crumbs: Array<{
      label: string;
      to?: string;
      folderId?: string | null;
    }> = [];

    if (selectedCardSet) {
      const crumbFolderId = folderId ?? selectedCardSet.folderId ?? null;
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

    setExtraCrumbs(crumbs);

    return () => {
      setExtraCrumbs([]);
    };
  }, [selectedCardSet, selectedCard, folderId, setExtraCrumbs]);

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
      targetId != null ? cardIndexById.get(targetId) ?? null : null;
    setIsFlipped(false);
    setIsGlobalEditing((prev) => !prev);
  }, [selectedCard?.id, cardIndexById]);

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
    const onSaveRequest = () => {
      setSaveSignal((prev) => prev + 1);
    };

    window.addEventListener("cardview:save-request", onSaveRequest);

    return () => {
      window.removeEventListener("cardview:save-request", onSaveRequest);
    };
  }, []);

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
      return (
        <DesktopCardSurface
          card={card}
          isActive={isActive}
          isGlobalEditing={isGlobalEditing}
          isFlipped={isFlipped}
          folderId={folderId}
          cardSetId={cardSetId}
          cardsOverride={cardsForPager}
          saveSignal={saveSignal}
          globalToolbarMountQ={globalToolbarMountQ}
          globalToolbarMountA={globalToolbarMountA}
          editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
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
      settings?.cardEditorHeightPx,
      handleFlip,
      handleEdit,
      handleToggleUncertainty,
      handleToggleBookmark,
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
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {isDesktop && (
          <div
            className="shrink-0 border-b border-gray-200/70 bg-[#F8FAFB] px-3 py-2 transition-[padding] duration-150"
            style={{
              paddingRight: isMetaOpen
                ? "calc(var(--ui-panel-width) + 0.75rem)"
                : undefined,
            }}
          >
            <div className="mx-auto grid w-full max-w-[1000px] grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="relative flex h-full min-h-0 overflow-hidden">
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
                getCardWidth={() =>
                  isGlobalEditing ? 1000 : CANONICAL_CARD_WIDTH
                }
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
                      editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
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

          {isMetaOpen && (
            <div className="hidden h-full min-h-0 md:block">
              <CardMetaPanel
                card={selectedCard}
                reviewLogs={selectedCard?.reviewLogs ?? []}
                onUpdateTags={(nextTags) => {
                  if (!selectedCard?.id) return;
                  void updateCard(selectedCard.id, { tags: nextTags });
                }}
                onToggleDraft={(nextDraft) => {
                  if (!selectedCard?.id) return;
                  void updateCard(selectedCard.id, { isDraft: nextDraft });
                }}
                onUpdateTitle={(nextTitle) => {
                  if (!selectedCard?.id) return;
                  void updateCard(selectedCard.id, { title: nextTitle });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}