import { useCallback } from "react";
import type { ReactNode } from "react";
import type { FlashcardCardLike } from "@/components/card/frame/Flashcard";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { CANONICAL_CARD_WIDTH } from "@/domain/card/cardGeometry.constants";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import type { Card, UserSettings } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";



interface CardSetViewMobileProps {
  cardsForPager: Card[];
  selectedCardId: string | null;
  safeCurrentIndex: number;
  isFlipped: boolean;
  isLoading: boolean;
  cardSetName: string | null;
  currentDisplayMode: CardDisplayMode;
  settings: Partial<UserSettings> | null | undefined;
  onIndexChange: (idx: number) => void;
  onFlip: () => void;
  onEdit: () => void;
  onCreateCard: () => void | Promise<void>;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
}
interface CardSetViewMobileEmptyStateProps {
  cardSetName: string | null;
  onCreateCard: () => void | Promise<void>;
}



const MOBILE_CARD_PAGER_PADDING_INLINE_PX = 0;
const MOBILE_CARD_PAGER_PADDING_BLOCK = "22px";
const MOBILE_CARD_PAGER_NATURAL_INDEX_COMMIT_DELAY_MS = 80;



const toFlashcardCardLike = (card: Card): FlashcardCardLike => ({
  id: card.id,
  cardId: card.cardId,
  hasUncertainty: card.hasUncertainty,
  has_uncertainty: card.hasUncertainty,
  isBookmarked: card.isBookmarked ?? false,
  is_bookmarked: card.isBookmarked ?? false,
  front: card.front,
  back: card.back,
  layoutRows: card.layoutRows,
  inkQuestion: card.front.ink ?? null,
  inkAnswer: card.back.ink ?? null,
});



const CardSetViewMobileEmptyState = ({ cardSetName, onCreateCard }: CardSetViewMobileEmptyStateProps) => {
  const handleCreateCard = () => {
    void onCreateCard();
  };

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center px-6 py-8">
      <div className="flex max-w-96 flex-col items-center rounded-3xl border border-[#e7e5de] bg-white px-7 py-7 text-center shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
        <div className="mb-2 max-w-full truncate text-sm font-semibold tracking-tight text-[#242424]">{cardSetName ?? "カードセット"}</div>
        <p className="text-xs font-medium leading-6 text-[#7b7b7b]">このカードセットにはまだカードがありません。</p>
        <button type="button" onClick={handleCreateCard} className="mt-5 rounded-full border border-[#d8d6cf] bg-[#f6f5f2] px-4 py-2 text-xs font-semibold text-[#2f343b] transition-colors hover:bg-[#eeeeea] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7c7]">
          カードを追加
        </button>
      </div>
    </div>
  );
};
const CardSetViewMobile = ({ cardsForPager, selectedCardId, safeCurrentIndex, isFlipped, isLoading, cardSetName, currentDisplayMode, settings, onIndexChange, onFlip, onEdit, onCreateCard, onToggleUncertainty, onToggleBookmark }: CardSetViewMobileProps) => {
  void selectedCardId;
  void settings;
  void onEdit;

  const wrapCard = useCallback(
    (node: ReactNode) => (
      <MobileScalableCard
        cardDesignWidth={CANONICAL_CARD_WIDTH}
        safePadding={0}
      >
        {node}
      </MobileScalableCard>
    ),
    [],
  );

  const renderCard = useCallback(
    (card: Card, idx: number, isActive: boolean) => {
      const flashcardCard = toFlashcardCardLike(card);

      return wrapCard(
        <Flashcard
          card={flashcardCard}
          isFlipped={isActive ? isFlipped : false}
          displayMode={currentDisplayMode}
          showInkLayer={currentDisplayMode === "fixed"}
          inkEditingEnabled={currentDisplayMode === "fixed"}
          onFlip={onFlip}
          onToggleUncertainty={() => {
            void onToggleUncertainty(card);
          }}
          onToggleBookmark={() => {
            void onToggleBookmark(card);
          }}
          currentIndex={idx}
          totalCards={cardsForPager.length}
        />,
      );
    },
    [
      cardsForPager.length,
      currentDisplayMode,
      isFlipped,
      onFlip,
      onToggleBookmark,
      onToggleUncertainty,
      wrapCard,
    ],
  );

  if (isLoading) {
    return <div className="h-full min-h-0 w-full" />;
  }

  if (cardsForPager.length === 0) {
    return <CardSetViewMobileEmptyState cardSetName={cardSetName} onCreateCard={onCreateCard} />;
  }

  return (
    <VerticalCardPager
      cards={cardsForPager}
      activeIndex={safeCurrentIndex}
      onActiveIndexChange={onIndexChange}
      onFlip={onFlip}
      paddingInlinePx={MOBILE_CARD_PAGER_PADDING_INLINE_PX}
      paddingBlock={MOBILE_CARD_PAGER_PADDING_BLOCK}
      naturalIndexCommitDelayMs={MOBILE_CARD_PAGER_NATURAL_INDEX_COMMIT_DELAY_MS}
      getCardWidthSpec={() => ({ mode: "stretch" })}
      getKey={(card) => card.id}
      renderCard={renderCard}
    />
  );
};



export { CardSetViewMobile };
