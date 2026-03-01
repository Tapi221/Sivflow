import React from 'react';
import StudyCard from '@/components/study/StudyCard';
import type { Card } from '@/types';

type Props = {
  currentCard: Card;
  currentIndex: number;
  totalCards: number;
  onResult: (subjectiveScore: number, responseTime: number) => void;
  onToggleUncertainty: (card: Card) => void;
  onToggleBookmark: (card: Card) => void;
  showHard: boolean;
  showEasy: boolean;
};

export function StudyReview({
  currentCard,
  currentIndex,
  totalCards,
  onResult,
  onToggleUncertainty,
  onToggleBookmark,
  showHard,
  showEasy,
}: Props) {
  return (
    <div className="reviewMain grid grid-cols-1 gap-8">
      <div className="w-full reviewCardColumn">
        <StudyCard
          card={currentCard}
          currentIndex={currentIndex}
          totalCards={totalCards}
          onResult={onResult}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
          showHard={showHard}
          showEasy={showEasy}
        />
      </div>
    </div>
  );
}