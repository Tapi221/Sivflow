import { useEffect, useState } from "react";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import type { StudyReviewProps } from "@/features/study/presentation/shared/studyReviewProps";
import StudyCard from "@/features/study/StudyCard";



const StudyReviewDesktop = ({ cards, sessionCurrentIndex, onResult, onToggleUncertainty, onToggleBookmark, onEdit, showHard, showEasy }: StudyReviewProps) => {
  const [flipTrigger, setFlipTrigger] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setFlipTrigger(0));
  }, [sessionCurrentIndex]);

  return (
    <div className="reviewMain h-full w-full">
      <VerticalCardPager
        cards={cards}
        activeIndex={sessionCurrentIndex}
        onActiveIndexChange={() => {}}
        onFlip={() => setFlipTrigger((current) => current + 1)}
        getKey={(card) => (card as { id?: string; }).id ?? ""}
        renderCard={(card, _idx, isActive) => (
          <StudyCard
            mode="review"
            card={card}
            flipTrigger={isActive ? flipTrigger : 0}
            onResult={onResult}
            onToggleUncertainty={onToggleUncertainty}
            onToggleBookmark={onToggleBookmark}
            onEdit={onEdit}
            showHard={showHard}
            showEasy={showEasy}
          />
        )}
      />
    </div>
  );
};



export { StudyReviewDesktop };
