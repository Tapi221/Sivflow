import React, { useCallback, useMemo, useState } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Flashcard } from './Flashcard';
import { MobileScalableCard } from './MobileScalableCard';
import { useUserSettings } from '@/hooks/useUserSettings';

export default function CardViewer({
  cards,
  currentIndex,
  onIndexChange,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark
}: {
  cards: any[],
  currentIndex: number,
  onIndexChange: (index: number) => void,
  onEdit: (card: any) => void,
  onToggleUncertainty: (card: any) => void,
  onToggleBookmark: (card: any) => void
}) {
  const { settings } = useUserSettings();
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when card changes
  const handleIndexChange = useCallback((newIndex: number) => {
      setIsFlipped(false);
      onIndexChange(newIndex);
  }, [onIndexChange]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
        handleIndexChange(currentIndex - 1);
    }
  }, [currentIndex, handleIndexChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
        handleIndexChange(currentIndex + 1);
    }
  }, [currentIndex, cards.length, handleIndexChange]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const shortcuts = useMemo(
    () => [
      { key: 'ArrowLeft', action: handlePrev, description: '前のカードへ移動' },
      { key: 'ArrowRight', action: handleNext, description: '次のカードへ移動' },
      { key: ' ', action: handleFlip, description: '裏表を切り替え' },
    ],
    [handlePrev, handleNext, handleFlip]
  );

  useKeyboardShortcuts(shortcuts);

  const card = cards[currentIndex];

  if (!card) {
    return <div className="text-center py-12 text-gray-500">カードがありません</div>;
  }

  return (
    <div className="max-w-[520px] mx-auto w-full">
      <MobileScalableCard cardDesignWidth={480} safePadding={24}>
        <Flashcard
           card={card}
           isFlipped={isFlipped}
           onFlip={handleFlip}
           onEdit={onEdit}
           onToggleUncertainty={onToggleUncertainty}
           onToggleBookmark={onToggleBookmark}
           showTags={false}
           onPrev={handlePrev}
           onNext={handleNext}
           hasNext={currentIndex < cards.length - 1}
           hasPrev={currentIndex > 0}
           currentIndex={currentIndex}
           totalCards={cards.length}
           editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
        />
      </MobileScalableCard>
    </div>
  );
}
