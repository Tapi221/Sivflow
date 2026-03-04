import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { CardCarousel3D } from '@/components/review/CardCarousel3D';
import { VerticalCardPager } from '@/components/review/VerticalCardPager';
import { MobileScalableCard } from '@/components/card/frame/MobileScalableCard';
import { Flashcard } from '@/components/card/frame/Flashcard';
import { CANONICAL_CARD_WIDTH, CARD_SAFE_PADDING_PX } from '@/components/card/common/constants';
import { useCardEntity } from '@/hooks/useCardEntity';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useIsDesktop } from '@/hooks/useIsDesktop';

export default function CardView() {
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get('folderId');
  const initialIndex = parseInt(urlParams.get('index') || '0');
  const targetCardId = urlParams.get('cardId');

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);

  const { cards = [], loading: isLoading, updateCard } = useCards(folderId || undefined);
  const { settings } = useUserSettings();
  const isDesktop = useIsDesktop();

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => (a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0));
  }, [cards]);

  // Update index if targetCardId is present and cards are loaded
  useEffect(() => {
    if (targetCardId && sortedCards.length > 0) {
      const foundIndex = sortedCards.findIndex(c => c.id === targetCardId);
      if (foundIndex !== -1) {
        setCurrentIndex(foundIndex);
      }
    }
  }, [targetCardId, sortedCards]);

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const currentCard = sortedCards[currentIndex];
  const { effectiveCard } = useCardEntity(currentCard?.id);
  const visibleCard = effectiveCard ?? currentCard;
  const effectiveCards = useMemo(() => {
    if (!effectiveCard) return sortedCards;
    return sortedCards.map((card) => (card.id === effectiveCard.id ? effectiveCard : card));
  }, [sortedCards, effectiveCard]);

  const handleEdit = (card) => {
    navigate(createPageUrl(`CardEdit?id=${card.id}&folderId=${folderId}&returnTo=card-view`));
  };

  const handleToggleUncertainty = async (card) => {
    const current = card.hasUncertainty ?? card.has_uncertainty ?? false;
    await updateCard(card.id, { hasUncertainty: !current });
  };

  const handleToggleBookmark = async (card) => {
    const current = card.isBookmarked ?? card.is_bookmarked ?? false;
    await updateCard(card.id, { isBookmarked: !current });
  };

  if (!folderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">フォルダが指定されていません</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#F5F7F8] flex flex-col overflow-hidden text-slate-800">
      {/* Header */}
      <div className="shrink-0 max-w-[1600px] w-full mx-auto px-3 md:px-8 py-3 md:py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl(`Folders?folderId=${folderId}`))}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-0.5">Knowledge Review</div>
            <h1 className="text-xl font-bold text-slate-700">
              {visibleCard?.title || 'Untitled Card'}
            </h1>
          </div>
        </div>
      </div>

      {/* Carousel area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="space-y-4 w-full max-w-md px-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          </div>
        ) : isDesktop ? (
          // ── PC: 縦スクロール式ページャ ──
          <VerticalCardPager
            cards={effectiveCards}
            activeIndex={currentIndex}
            onActiveIndexChange={setCurrentIndex}
            onFlip={() => setIsFlipped(f => !f)}
            getKey={(card) => card.id ?? card.docId ?? card.uid}
            renderCard={(card, idx, isActive) => (
              <MobileScalableCard cardDesignWidth={CANONICAL_CARD_WIDTH} safePadding={CARD_SAFE_PADDING_PX}>
                <Flashcard
                  card={card}
                  isFlipped={isActive ? isFlipped : false}
                  onFlip={isActive ? () => setIsFlipped(f => !f) : undefined}
                  onEdit={isActive ? handleEdit : undefined}
                  onToggleUncertainty={isActive ? handleToggleUncertainty : undefined}
                  onToggleBookmark={isActive ? handleToggleBookmark : undefined}
                  editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
                />
              </MobileScalableCard>
            )}
          />
        ) : (
          // ── モバイル: 横カルーセル（既存）──
          <CardCarousel3D
            cards={effectiveCards}
            syncIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            renderCenter={(card, idx) => (
              <MobileScalableCard cardDesignWidth={CANONICAL_CARD_WIDTH} safePadding={CARD_SAFE_PADDING_PX}>
                <Flashcard
                  card={card}
                  isFlipped={isFlipped}
                  onFlip={() => setIsFlipped(f => !f)}
                  onEdit={handleEdit}
                  onToggleUncertainty={handleToggleUncertainty}
                  onToggleBookmark={handleToggleBookmark}
                  onPrev={() => idx > 0 && setCurrentIndex(idx - 1)}
                  onNext={() => idx < effectiveCards.length - 1 && setCurrentIndex(idx + 1)}
                  hasNext={idx < effectiveCards.length - 1}
                  hasPrev={idx > 0}
                  currentIndex={idx}
                  totalCards={effectiveCards.length}
                  editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
                />
              </MobileScalableCard>
            )}
            renderPreview={(card) => (
              <MobileScalableCard cardDesignWidth={CANONICAL_CARD_WIDTH} safePadding={CARD_SAFE_PADDING_PX}>
                <Flashcard card={card} isFlipped={false} previewMode={true} />
              </MobileScalableCard>
            )}
          />
        )}
      </div>
    </div>
  );
}
