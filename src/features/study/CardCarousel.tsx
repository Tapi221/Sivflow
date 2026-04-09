import type { ComponentProps } from "react";
import {
  CARD_BASE_WIDTH,
  CARD_DISPLAY_SCALE,
  CARD_SAFE_PADDING_PX,
} from "@/components/card/common/constants";
import {
  Flashcard,
  type FlashcardCardLike,
} from "@/components/card/frame/Flashcard";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { CardCarousel3D } from "@/features/review/presentation/web/ui/components/CardCarousel3D";
import StudyCard from "./StudyCard";
import type { Card } from "@/types";

type StudyCardProps = ComponentProps<typeof StudyCard>;

const CARD_DISPLAY_WIDTH = Math.round(CARD_BASE_WIDTH * CARD_DISPLAY_SCALE);

type CardCarouselProps = {
  cards: Card[];
  /** Study session's authoritative index — syncs carousel when a rating is submitted */
  sessionCurrentIndex: number;
  onResult: StudyCardProps["onResult"];
  onToggleUncertainty?: (card: Card) => void;
  onToggleBookmark?: (card: Card) => void;
  onEdit?: (card: Card) => void;
  showHard?: boolean;
  showEasy?: boolean;
};

export const CardCarousel = ({
  cards,
  sessionCurrentIndex,
  onResult,
  onToggleUncertainty,
  onToggleBookmark,
  onEdit,
  showHard = true,
  showEasy = true,
}: CardCarouselProps) => {
  return (
    <CardCarousel3D
      cards={cards}
      syncIndex={sessionCurrentIndex}
      renderCenter={(card) => (
        <StudyCard
          card={card}
          onResult={onResult}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
          onEdit={onEdit}
          showHard={showHard}
          showEasy={showEasy}
        />
      )}
      renderPreview={(card) => (
        <MobileScalableCard
          cardDesignWidth={CARD_DISPLAY_WIDTH}
          safePadding={CARD_SAFE_PADDING_PX}
        >
          <Flashcard
            card={card as unknown as FlashcardCardLike}
            isFlipped={false}
            previewMode={true}
          />
        </MobileScalableCard>
      )}
    />
  );
};
