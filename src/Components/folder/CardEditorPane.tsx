import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { Flashcard } from '@/Components/card/Flashcard';
import { useCards } from '@/hooks/useCards';

interface CardEditorPaneProps {
  selectedCardId: string | null;
  onCardUpdated?: () => void;
}

export function CardEditorPane({ selectedCardId, onCardUpdated }: CardEditorPaneProps) {
  const { cards, updateCard } = useCards();
  // カードの問題/解答のフリップ状態を管理
  const [isFlipped, setIsFlipped] = useState(false);

  // 選択されたカードを取得
  const selectedCard = selectedCardId
    ? cards.find(c => c.id === selectedCardId)
    : null;

  // カード未選択時のプレースホルダー
  if (!selectedCardId || !selectedCard) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-bold">左のツリーからカードを選択してください</p>
          <p className="text-xs mt-2 opacity-70">カードをクリックすると閲覧できます</p>
        </div>
      </div>
    );
  }

  // ブックマークのトグルハンドラー
  const handleToggleBookmark = async (card: any) => {
    try {
      await updateCard(card.id, { isBookmarked: !card.isBookmarked });
      if (onCardUpdated) onCardUpdated();
    } catch (error) {
      console.error('ブックマークの更新に失敗しました:', error);
    }
  };

  // 不確証マークのトグルハンドラー
  const handleToggleUncertainty = async (card: any) => {
    try {
      await updateCard(card.id, { hasUncertainty: !card.hasUncertainty });
      if (onCardUpdated) onCardUpdated();
    } catch (error) {
      console.error('不確証マークの更新に失敗しました:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <Flashcard
        card={selectedCard}
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped(prev => !prev)}
        onToggleBookmark={handleToggleBookmark}
        onToggleUncertainty={handleToggleUncertainty}
        showNavigation={false}
        showTags={true}
      />
    </div>
  );
}
