import React, { useEffect, useState } from 'react';
import { CardCarousel } from '@/components/study/CardCarousel';
import { VerticalCardPager } from '@/components/review/VerticalCardPager';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import StudyCard from '@/components/study/StudyCard';
import type { Card } from '@/types';

type Props = {
  cards: Card[];
  sessionCurrentIndex: number;
  onResult: (subjectiveScore: number, responseTime: number) => void;
  onToggleUncertainty: (card: Card) => void;
  onToggleBookmark: (card: Card) => void;
  onEdit?: (card: Card) => void;
  showHard: boolean;
  showEasy: boolean;
};

export function StudyReview({
  cards,
  sessionCurrentIndex,
  onResult,
  onToggleUncertainty,
  onToggleBookmark,
  onEdit,
  showHard,
  showEasy,
}: Props) {
  const isDesktop = useIsDesktop();

  // Space/Enter でアクティブカードをめくるためのトリガーカウンタ
  const [flipTrigger, setFlipTrigger] = useState(0);
  // 新しいカードに移ったらトリガーをリセット
  useEffect(() => {
    setFlipTrigger(0);
  }, [sessionCurrentIndex]);

  if (isDesktop) {
    return (
      <div className="reviewMain h-full w-full">
        <VerticalCardPager
          cards={cards}
          activeIndex={sessionCurrentIndex}
          // StudyMode はセッションが index を管理するため IO では変更しない
          onActiveIndexChange={() => {}}
          onFlip={() => setFlipTrigger((t) => t + 1)}
          getKey={(card) => (card as { id?: string }).id ?? ''}
          renderCard={(card, idx, isActive) => (
            <StudyCard
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
  }

  // モバイル: 既存の横カルーセル
  return (
    <div className="reviewMain h-full w-full">
      <CardCarousel
        cards={cards}
        sessionCurrentIndex={sessionCurrentIndex}
        onResult={onResult}
        onToggleUncertainty={onToggleUncertainty}
        onToggleBookmark={onToggleBookmark}
        onEdit={onEdit}
        showHard={showHard}
        showEasy={showEasy}
      />
    </div>
  );
}
