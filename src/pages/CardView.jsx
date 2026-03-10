import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useCards } from "@/hooks/card/useCards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { CardCarousel3D } from "@/features/review/CardCarousel3D";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import { CardEditorPane } from "@/components/folder/panes/CardEditorPane";
import {
  CANONICAL_CARD_WIDTH,
} from "@/components/card/common/constants";
import { useCardEntity } from "@/hooks/card/useCardEntity";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";

const CARDVIEW_PAGER_PADDING_INLINE = 16;
const CARDVIEW_PAGER_PADDING_BLOCK = "50vh";

export default function CardView() {
  const { setExtraCrumbs } = useBreadcrumbContext();

  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get("folderId");
  const cardSetId = urlParams.get("cardSetId");
  const initialIndex = parseInt(urlParams.get("index") || "0");
  const targetCardId = urlParams.get("cardId");

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);
  const pendingFocusCardIdRef = useRef(null);
  const suppressPagerSyncRef = useRef(false);
  const lockedIndexRef = useRef(null);
  const [globalToolbarMountQ, setGlobalToolbarMountQ] = useState(null);
  const [globalToolbarMountA, setGlobalToolbarMountA] = useState(null);
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

  // Update index if targetCardId is present and cards are loaded
  useEffect(() => {
    if (targetCardId && sortedCards.length > 0) {
      const foundIndex = sortedCards.findIndex((c) => c.id === targetCardId);
      if (foundIndex !== -1) {
        setCurrentIndex(foundIndex);
      }
    }
  }, [targetCardId, sortedCards]);

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const currentCard = sortedCards[currentIndex];
  const { effectiveCard } = useCardEntity(currentCard?.id);
  const effectiveCards = useMemo(() => {
    if (!effectiveCard) return sortedCards;
    return sortedCards.map((card) =>
      card.id === effectiveCard.id ? effectiveCard : card,
    );
  }, [sortedCards, effectiveCard]);
  const selectedCard = effectiveCards[currentIndex] ?? null;
  const selectedCardSet = useMemo(() => {
    if (!cardSetId) return null;
    return cardSets.find((set) => set.id === cardSetId) ?? null;
  }, [cardSetId, cardSets]);

  useEffect(() => {
    const crumbs = [];

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

  const handleEdit = () => setIsGlobalEditing(true);

  const handleToggleUncertainty = async (card) => {
    const current = card.hasUncertainty ?? card.has_uncertainty ?? false;
    await updateCard(card.id, { hasUncertainty: !current });
  };

  const handleToggleBookmark = async (card) => {
    const current = card.isBookmarked ?? card.is_bookmarked ?? false;
    await updateCard(card.id, { isBookmarked: !current });
  };

  const handleToggleViewMode = useCallback(() => {
    const targetId = selectedCard?.id ?? null;
    pendingFocusCardIdRef.current = targetId;
    suppressPagerSyncRef.current = true;
    lockedIndexRef.current =
      targetId != null
        ? effectiveCards.findIndex((c) => c.id === targetId)
        : null;
    setIsFlipped(false);
    setIsGlobalEditing((prev) => !prev);
  }, [selectedCard?.id, effectiveCards]);

  useEffect(() => {
    const targetId = pendingFocusCardIdRef.current;
    if (!targetId) return;
    const nextIndex = effectiveCards.findIndex((c) => c.id === targetId);
    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
      lockedIndexRef.current = nextIndex;
    }
    pendingFocusCardIdRef.current = null;
    const timer = window.setTimeout(() => {
      suppressPagerSyncRef.current = false;
      lockedIndexRef.current = null;
    }, 220);
    return () => window.clearTimeout(timer);
  }, [isGlobalEditing, effectiveCards]);

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
    return () =>
      window.removeEventListener(
        "cardview:toggle-editing-request",
        onToggleEditingRequest,
      );
  }, [handleToggleViewMode]);

  useEffect(() => {
    const onSaveRequest = () => {
      setSaveSignal((prev) => prev + 1);
    };
    window.addEventListener("cardview:save-request", onSaveRequest);
    return () =>
      window.removeEventListener("cardview:save-request", onSaveRequest);
  }, []);

  if (!folderId && !cardSetId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">フォルダまたはカードセットが指定されていません</p>
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
            paddingRight: isMetaOpen ? "calc(var(--ui-panel-width) + 0.75rem)" : undefined,
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
              cards={effectiveCards}
              activeIndex={currentIndex}
              onActiveIndexChange={(idx) => {
                if (
                  suppressPagerSyncRef.current &&
                  lockedIndexRef.current != null &&
                  idx !== lockedIndexRef.current
                ) {
                  return;
                }
                setCurrentIndex(idx);
              }}
              onFlip={() => setIsFlipped((f) => !f)}
              paddingInlinePx={CARDVIEW_PAGER_PADDING_INLINE}
              paddingBlock={CARDVIEW_PAGER_PADDING_BLOCK}
              getCardWidth={() =>
                isGlobalEditing ? 1000 : CANONICAL_CARD_WIDTH
              }
              getKey={(card) => card.id ?? card.docId ?? card.uid}
              renderCard={(card, idx, isActive) => (
                isGlobalEditing ? (
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
                      cardsOverride={effectiveCards}
                      autoEdit
                      hideMetaPanel
                      dockToolbarsToTop
                      hideBlockToolbars={!isActive}
                      saveSignal={saveSignal}
                      hideFooterActions
                      embeddedInPager
                      externalToolbarMountQ={isActive ? globalToolbarMountQ : null}
                      externalToolbarMountA={isActive ? globalToolbarMountA : null}
                      pairGapClassName="gap-4"
                    />
                  </div>
                ) : (
                  <MobileScalableCard
                    cardDesignWidth={CANONICAL_CARD_WIDTH}
                    safePadding={0}
                  >
                    <Flashcard
                      card={card}
                      isFlipped={isActive ? isFlipped : false}
                      onFlip={isActive ? () => setIsFlipped((f) => !f) : undefined}
                      onEdit={isActive ? handleEdit : undefined}
                      onToggleUncertainty={
                        isActive ? handleToggleUncertainty : undefined
                      }
                      onToggleBookmark={isActive ? handleToggleBookmark : undefined}
                      editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
                    />
                  </MobileScalableCard>
                )
              )}
            />
          ) : (
            // ── モバイル: 横カルーセル（既存）──
            <CardCarousel3D
              cards={effectiveCards}
              syncIndex={currentIndex}
              onIndexChange={setCurrentIndex}
              renderCenter={(card, idx) => (
                <MobileScalableCard
                  cardDesignWidth={CANONICAL_CARD_WIDTH}
                  safePadding={0}
                >
                  <Flashcard
                    card={card}
                    isFlipped={isFlipped}
                    onFlip={() => setIsFlipped((f) => !f)}
                    onEdit={handleEdit}
                    onToggleUncertainty={handleToggleUncertainty}
                    onToggleBookmark={handleToggleBookmark}
                    onPrev={() => idx > 0 && setCurrentIndex(idx - 1)}
                    onNext={() =>
                      idx < effectiveCards.length - 1 && setCurrentIndex(idx + 1)
                    }
                    hasNext={idx < effectiveCards.length - 1}
                    hasPrev={idx > 0}
                    currentIndex={idx}
                    totalCards={effectiveCards.length}
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







