import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCards } from "@/hooks/useCards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { createPageUrl } from "@/utils";
import { CardCarousel3D } from "@/features/review/CardCarousel3D";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import {
  CANONICAL_CARD_WIDTH,
} from "@/components/card/common/constants";
import { useCardEntity } from "@/hooks/useCardEntity";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useIsDesktopRuntime } from "@/hooks/useIsDesktopRuntime";

export default function CardView() {
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get("folderId");
  const initialIndex = parseInt(urlParams.get("index") || "0");
  const targetCardId = urlParams.get("cardId");

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMetaOpen, setIsMetaOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("card-view.meta-panel-open") !== "false";
  });

  const {
    cards = [],
    loading: isLoading,
    updateCard,
  } = useCards(folderId || undefined);
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

  const handleEdit = (card) => {
    navigate(
      createPageUrl(
        `CardEdit?id=${card.id}&folderId=${folderId}&returnTo=card-view`,
      ),
    );
  };

  const handleToggleUncertainty = async (card) => {
    const current = card.hasUncertainty ?? card.has_uncertainty ?? false;
    await updateCard(card.id, { hasUncertainty: !current });
  };

  const handleToggleBookmark = async (card) => {
    const current = card.isBookmarked ?? card.is_bookmarked ?? false;
    await updateCard(card.id, { isBookmarked: !current });
  };

  if (!folderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">フォルダが指定されていません</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#F5F7F8] pt-0 card-editor-right-pane-font">
      <div className="relative flex h-full min-h-0 overflow-hidden">
      <div className="pointer-events-none absolute left-4 top-3 z-20 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            navigate(createPageUrl(`Folders?folderId=${folderId}`))
          }
          className="pointer-events-auto w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="pointer-events-auto hidden md:block">
          <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-0.5">
            Knowledge Review
          </div>
          <h1 className="text-base font-bold text-slate-700">
            {selectedCard?.title || "Untitled Card"}
          </h1>
        </div>
      </div>

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
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="space-y-4 w-full max-w-md px-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            </div>
          ) : isDesktop ? (
            // ── PC: 縦スクロール式ページャ ──
            <VerticalCardPager
              cards={effectiveCards}
              activeIndex={currentIndex}
              onActiveIndexChange={setCurrentIndex}
              onFlip={() => setIsFlipped((f) => !f)}
              getKey={(card) => card.id ?? card.docId ?? card.uid}
              renderCard={(card, idx, isActive) => (
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
  );
}
