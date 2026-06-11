import { useEffect, useState } from "react";
import { CardCarousel3D } from "@/features/review/presentation/web/ui/components/CardCarousel3D";
import StudyCard from "./StudyCard";
import type { Card } from "@/types";



type StudyCardProps = React.ComponentProps<typeof StudyCard>;
type ReviewResultHandler = Extract<StudyCardProps, { mode: "review"; }>["onResult"];
type PracticeResultHandler = Extract<StudyCardProps, { mode: "practice"; }>["onResult"];
type CardCarouselBaseProps = {
  cards: Card[];
  sessionCurrentIndex: number;
  onToggleUncertainty: (card: Card) => void;
  onToggleBookmark: (card: Card) => void;
  onEdit?: (card: Card) => void;
  showHard: boolean;
  showEasy: boolean;
};
type ReviewCardCarouselProps = CardCarouselBaseProps & {
  mode: "review";
  onResult?: ReviewResultHandler;
};
type PracticeCardCarouselProps = CardCarouselBaseProps & {
  mode: "practice";
  onResult?: PracticeResultHandler;
};
type CardCarouselProps = ReviewCardCarouselProps | PracticeCardCarouselProps;



const CardCarousel = ({ cards, mode, sessionCurrentIndex, onResult, onToggleUncertainty, onToggleBookmark, onEdit, showHard, showEasy }: CardCarouselProps) => {
  const [flipTrigger, setFlipTrigger] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setFlipTrigger(0));
  }, [sessionCurrentIndex]);

  return (
    <CardCarousel3D
      cards={cards}
      syncIndex={sessionCurrentIndex}
      onIndexChange={() => {}}
      onFlip={() => setFlipTrigger((current) => current + 1)}
      getKey={(card) => card.id}
      renderCenter={(card, _index, isActive) => (
        <StudyCard
          mode={mode}
          card={card}
          flipTrigger={isActive ? flipTrigger : 0}
          onResult={onResult as never}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
          onEdit={onEdit}
          showHard={showHard}
          showEasy={showEasy}
        />
      )}
    />
  );
};



export { CardCarousel };


export type { CardCarouselProps };
