import { useCallback, useMemo } from "react";
import { CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS, CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS, CARD_SET_VIEW_PAGER_PADDING_BLOCK, CARD_SET_VIEW_PAGER_PADDING_INLINE } from "@constants/shared/flashcard";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { DesktopCardSurface } from "@/features/cardsetview/presentation/web/ui/components/DesktopCardSurface";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import type { Card, UserSettings } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";

type CardSetViewDesktopProps = {
  isLoading: boolean;
  isGlobalEditing: boolean;
  flippedCardIds: Set<string>;
  cardsForPager: Card[];
  safeCurrentIndex: number;
  settings?: Partial<UserSettings> | null;
  currentDisplayMode: CardDisplayMode;
  currentCardLayoutMode: CardLayoutMode;
  folderId: string | null;
  layoutTransitionScrollAnchorRevision: number;
  scrollToActiveIndexRequestKey: number;
  cardSetId: string | null;
  cardSetName: string | null;
  viewZoomScale: number;
  fixedCardWidthPx: number;
  fluidAvailableWidthPx: number;
  onActiveIndexChange: (idx: number) => void;
  onFlip: () => void;
  onActiveScrollAnchorFaceChange?: (face: "question" | "answer" | null) => void;
  onCreateCard: () => void | Promise<void>;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
};

type CardSetViewEmptyStateProps = {
  cardSetName: string | null;
  onCreateCard: () => void | Promise<void>;
};

const CardSetViewEmptyState = ({ cardSetName, onCreateCard }: CardSetViewEmptyStateProps) => {
  const handleCreateCard = () => {
    void onCreateCard();
  };

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center px-8 py-10">
      <div className="flex max-w-[420px] flex-col items-center rounded-[28px] border border-[#e7e5de] bg-white px-8 py-7 text-center shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
        <div className="mb-2 max-w-full truncate text-[15px] font-semibold tracking-[-0.02em] text-[#242424]">{cardSetName ?? "カードセット"}</div>
        <p className="text-[13px] font-medium leading-6 text-[#7b7b7b]">このカードセットにはまだカードがありません。</p>
        <button type="button" onClick={handleCreateCard} className="mt-5 rounded-full border border-[#d8d6cf] bg-[#f6f5f2] px-4 py-2 text-[12px] font-semibold text-[#2f343b] transition-colors hover:bg-[#eeeeea] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7c7]">
          カードを追加
        </button>
      </div>
    </div>
  );
};

export const CardSetViewDesktop = ({
  isLoading,
  isGlobalEditing,
  flippedCardIds,
  cardsForPager,
  safeCurrentIndex,
  settings = null,
  currentDisplayMode,
  currentCardLayoutMode,
  folderId,
  layoutTransitionScrollAnchorRevision,
  scrollToActiveIndexRequestKey,
  cardSetId,
  cardSetName,
  viewZoomScale,
  fixedCardWidthPx,
  fluidAvailableWidthPx,
  onActiveIndexChange,
  onFlip,
  onActiveScrollAnchorFaceChange,
  onCreateCard,
  onToggleUncertainty,
  onToggleBookmark,
}: CardSetViewDesktopProps) => {
  const effectiveCardWidthPx = currentDisplayMode === "fluid" ? Math.max(1, Math.floor(fluidAvailableWidthPx)) : Math.max(1, fixedCardWidthPx);

  const preserveScrollAnchorKey = useMemo(() => [currentDisplayMode, isGlobalEditing ? "edit" : "view", Math.round(viewZoomScale * 1000), effectiveCardWidthPx, Math.round(fluidAvailableWidthPx), layoutTransitionScrollAnchorRevision].join(":"), [currentDisplayMode, effectiveCardWidthPx, fluidAvailableWidthPx, isGlobalEditing, layoutTransitionScrollAnchorRevision, viewZoomScale]);

  const getScrollAnchorSelector = useCallback((card: Card, _idx: number, isActive: boolean) => {
    if (!isActive || currentCardLayoutMode !== "flip") return null;

    const cardId = card.id ?? "";
    return flippedCardIds.has(cardId) ? "[data-card-face=\"answer\"]" : "[data-card-face=\"question\"]";
  }, [currentCardLayoutMode, flippedCardIds]);

  const renderCard = useCallback((card: Card, _idx: number, isActive: boolean) => {
    return (
      <DesktopCardSurface
        card={card}
        isActive={isActive}
        isGlobalEditing={isGlobalEditing}
        settings={settings}
        isFlipped={flippedCardIds.has(card.id ?? "")}
        currentDisplayMode={currentDisplayMode}
        currentCardLayoutMode={currentCardLayoutMode}
        viewZoomScale={viewZoomScale}
        folderId={folderId}
        cardSetId={cardSetId}
        cardsOverride={isGlobalEditing ? cardsForPager : undefined}
        onFlip={onFlip}
        onToggleUncertainty={onToggleUncertainty}
        onToggleBookmark={onToggleBookmark}
      />
    );
  }, [cardSetId, cardsForPager, currentCardLayoutMode, currentDisplayMode, flippedCardIds, folderId, isGlobalEditing, onFlip, onToggleBookmark, onToggleUncertainty, settings, viewZoomScale]);

  if (isLoading) {
    return <div className="h-full min-h-0 w-full" />;
  }

  if (cardsForPager.length === 0) {
    return <CardSetViewEmptyState cardSetName={cardSetName} onCreateCard={onCreateCard} />;
  }

  return (
    <VerticalCardPager
      cards={cardsForPager}
      activeIndex={safeCurrentIndex}
      onActiveIndexChange={onActiveIndexChange}
      onFlip={onFlip}
      paddingInlinePx={CARD_SET_VIEW_PAGER_PADDING_INLINE}
      paddingBlock={CARD_SET_VIEW_PAGER_PADDING_BLOCK}
      naturalIndexCommitDelayMs={isGlobalEditing ? CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS : CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS}
      disableItemChrome={isGlobalEditing}
      getCardWidthSpec={() => currentDisplayMode === "fluid" ? { mode: "stretch" as const } : { mode: "fixed" as const, widthPx: effectiveCardWidthPx }}
      getKey={(card) => card.id}
      disableVirtualization={false}
      onActiveScrollAnchorFaceChange={onActiveScrollAnchorFaceChange}
      getScrollAnchorSelector={getScrollAnchorSelector}
      preserveScrollAnchorKey={preserveScrollAnchorKey}
      scrollToActiveIndexRequestKey={scrollToActiveIndexRequestKey}
      scrollToActiveIndexBehavior="auto"
      renderCard={renderCard}
    />
  );
};
