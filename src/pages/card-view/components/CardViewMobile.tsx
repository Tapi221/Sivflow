import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { CardCarousel3D } from "@/features/review/CardCarousel3D";
import type { Card } from "@/types";
import type { UserSettings } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import { useCallback } from "react";

interface CardViewMobileProps {
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

export function CardViewMobile({
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
}: CardViewMobileProps) {
  void selectedCardId;
  const wrapCard = useCallback(
    (node: React.ReactNode) => (
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
    (card: Card, idx: number) =>
      wrapCard(
        <Flashcard
          card={card}
          isFlipped={isFlipped}
          displayMode={currentDisplayMode}
          showInkLayer={currentDisplayMode === "fixed"}
          inkEditingEnabled={currentDisplayMode === "fixed"}
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
        />,
      ),
    [
      cardsForPager.length,
      currentDisplayMode,
      isFlipped,
      onEdit,
      onFlip,
      onIndexChange,
      onToggleBookmark,
      onToggleUncertainty,
      settings?.cardEditorHeightPx,
      wrapCard,
    ],
  );

  const renderPreview = useCallback(
    (card: Card) =>
      wrapCard(
        <Flashcard
          card={card}
          isFlipped={false}
          previewMode={true}
          displayMode={currentDisplayMode}
          showInkLayer={currentDisplayMode === "fixed"}
        />,
      ),
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
}
