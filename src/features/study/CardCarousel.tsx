import type { ComponentProps } from "react";
import { CardCarousel3D } from "@/features/review/CardCarousel3D";
import StudyCard from "./StudyCard";
import type { Card } from "@/types";

type StudyCardProps = ComponentProps<typeof StudyCard>;

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

export function CardCarousel({
  cards,
  sessionCurrentIndex,
  onResult,
  onToggleUncertainty,
  onToggleBookmark,
  onEdit,
  showHard = true,
  showEasy = true,
}: CardCarouselProps) {
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
    />
  );
}



