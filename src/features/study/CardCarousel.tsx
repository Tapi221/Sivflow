import {
  CARD_BASE_WIDTH,
  CARD_DISPLAY_SCALE,
  CARD_SAFE_PADDING_PX,
} from "@constants/shared/cardGeometry";
import type { ComponentProps } from "react";
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

type BaseCardCarouselProps = {
  cards: Card[];
  sessionCurrentIndex: number;
  onToggleUncertainty?: (card: Card) => void;
  onToggleBookmark?: (card: Card) => void;
  onEdit?: (card: Card) => void;
  showHard?: boolean;
  showEasy?: boolean;
};

type ReviewCardCarouselProps = BaseCardCarouselProps & {
  mode?: "review";
  onResult: Extract<StudyCardProps, { mode?: "review" }>["onResult"];
};

type PracticeCardCarouselProps = BaseCardCarouselProps & {
  mode: "practice";
  onResult: Extract<StudyCardProps, { mode: "practice" }>["onResult"];
};

type CardCarouselProps = ReviewCardCarouselProps | PracticeCardCarouselProps;

export const CardCarousel = ({
  cards,
  sessionCurrentIndex,
  mode = "review",
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
          mode={mode}
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
