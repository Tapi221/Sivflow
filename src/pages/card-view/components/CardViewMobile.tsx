import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { CardCarousel3D } from "@/features/review/CardCarousel3D";
import type { Card } from "@/types";
import type { UserSettings } from "@/types";

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
  return (
    <CardCarousel3D
      cards={cardsForPager}
      syncIndex={safeCurrentIndex}
      onIndexChange={onIndexChange}
      renderCenter={(card, idx) => (
        <MobileScalableCard cardDesignWidth={CANONICAL_CARD_WIDTH} safePadding={0}>
          <Flashcard
            card={card}
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
      )}
      renderPreview={(card) => (
        <MobileScalableCard cardDesignWidth={CANONICAL_CARD_WIDTH} safePadding={0}>
          <Flashcard card={card} isFlipped={false} previewMode={true} />
        </MobileScalableCard>
      )}
    />
  );
}
