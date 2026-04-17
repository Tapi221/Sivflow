import { CANONICAL_CARD_WIDTH } from "@constants/shared/flashcard";
import {
  Flashcard,
  type FlashcardCardLike,
} from "@/components/card/frame/Flashcard";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { CardCarousel3D } from "@/features/review/presentation/web/ui/components/CardCarousel3D";
import type { Card, UserSettings } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import { useCallback, type ReactNode } from "react";

interface CardSetViewMobileProps {
  cardsForPager: Card[];
  selectedCardId: string | null;
  safeCurrentIndex: number;
  isFlipped: boolean;
  currentDisplayMode: CardDisplayMode;
  settings: UserSettings | undefined;
  onIndexChange: (idx: number) => void;
  onFlip: () => void;
  onEdit: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
}

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

export const CardSetViewMobile = ({
  cardsForPager,
  selectedCardId,
  safeCurrentIndex,
  isFlipped,
  currentDisplayMode,
  settings,
  onIndexChange,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: CardSetViewMobileProps) => {
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

  const renderCenter = useCallback(
    (card: Card, idx: number) => {
      const flashcardCard = toFlashcardCardLike(card);

      return wrapCard(
        <Flashcard
          card={flashcardCard}
          isFlipped={isFlipped}
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
          onPrev={() => idx > 0 && onIndexChange(idx - 1)}
          onNext={() =>
            idx < cardsForPager.length - 1 && onIndexChange(idx + 1)
          }
          hasNext={idx < cardsForPager.length - 1}
          hasPrev={idx > 0}
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
      onIndexChange,
      onToggleBookmark,
      onToggleUncertainty,
      wrapCard,
    ],
  );

  const renderPreview = useCallback(
    (card: Card) => {
      const flashcardCard = toFlashcardCardLike(card);

      return wrapCard(
        <Flashcard
          card={flashcardCard}
          isFlipped={false}
          previewMode={true}
          displayMode={currentDisplayMode}
          showInkLayer={currentDisplayMode === "fixed"}
        />,
      );
    },
    [currentDisplayMode, wrapCard],
  );

  return (
    <CardCarousel3D
      cards={cardsForPager}
      syncIndex={safeCurrentIndex}
      onIndexChange={onIndexChange}
      renderCenter={renderCenter}
      renderPreview={renderPreview}
    />
  );
};
