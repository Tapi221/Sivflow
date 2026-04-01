import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { CardCarousel3D } from "@/features/review/CardCarousel3D";
import type { Card } from "@/types";
import type { UserSettings } from "@/types";
import { useCallback } from "react";

interface CardViewMobileProps {
  cardsForPager: Card[];
  safeCurrentIndex: number;
  isFlipped: boolean;
  settings: UserSettings | undefined;
  onIndexChange: (idx: number) => void;
  onFlip: () => void;
  onEdit: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
}

export function CardViewMobile({
  cardsForPager,
  safeCurrentIndex,
  isFlipped,
  settings,
  onIndexChange,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: CardViewMobileProps) {
  const renderCenter = useCallback(
    (card: Card, idx: number) => (
      <MobileScalableCard cardDesignWidth={CANONICAL_CARD_WIDTH} safePadding={0}>
        <Flashcard card={adaptCard(card)}
          isFlipped={isFlipped}
          onFlip={onFlip}
          onEdit={onEdit}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
          onPrev={() => idx > 0 && onIndexChange(idx - 1)}
          onNext={() =>
            idx < cardsForPager.length - 1 && onIndexChange(idx + 1)
          }
          hasNext={idx < cardsForPager.length - 1}
          hasPrev={idx > 0}
          currentIndex={idx}
          totalCards={cardsForPager.length}
          editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
        />
      </MobileScalableCard>
    ),
    [
      cardsForPager.length,
      isFlipped,
      onEdit,
      onFlip,
      onIndexChange,
      onToggleBookmark,
      onToggleUncertainty,
      settings?.cardEditorHeightPx,
    ],
  );

  const renderPreview = useCallback(
    (card: Card) => (
      <MobileScalableCard cardDesignWidth={CANONICAL_CARD_WIDTH} safePadding={0}>
        <Flashcard card={adaptCard(card)} isFlipped={false} previewMode={true} />
      </MobileScalableCard>
    ),
    [],
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
}


