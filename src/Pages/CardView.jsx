import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { ArrowLeft, ShieldCheck, Tag } from 'lucide-react';
import { createPageUrl } from '@/utils';
import CardViewer from '@/Components/card/CardViewer';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/Components/ui/tooltip';

import { normalizeMemoryStability, getResistancePhase } from '@/utils/reviewUtils';
import { calculateResistanceScore } from '@/utils/reviewMetrics';

export default function CardView() {
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get('folderId');
  const initialIndex = parseInt(urlParams.get('index') || '0');
  const targetCardId = urlParams.get('cardId');
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  const { cards = [], loading: isLoading, updateCard } = useCards(folderId || undefined);
  
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => (a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0));
  }, [cards]);
  
  // Update index if targetCardId is present and cards are loaded
  React.useEffect(() => {
    if (targetCardId && sortedCards.length > 0) {
      const foundIndex = sortedCards.findIndex(c => c.id === targetCardId);
      if (foundIndex !== -1) {
        setCurrentIndex(foundIndex);
      }
    }
  }, [targetCardId, sortedCards]);
  
  const currentCard = sortedCards[currentIndex];
  
  // --- Metrics Calculation ---
  const normalizedStability = currentCard 
    ? normalizeMemoryStability(currentCard.memoryStability, currentCard.currentLevel ?? currentCard.level)
    : 0;
  
  // Interval extraction (estimated from nextReviewDate or next_review_date vs lastReviewDate etc.)
  // Ideally card should have 'interval' field. If not, use diff between Now and NextReview
  const intervalDays =  currentCard?.interval ?? 1;

  // Retention is internal-only now.
  const resistance = calculateResistanceScore(currentCard?.interval ?? 0);
  const resistancePhase = getResistancePhase(resistance);

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
    <div className="min-h-screen bg-[#F5F7F8] text-slate-800 font-serif">
      <div className="max-w-[1600px] mx-auto p-2 md:pt-8 md:pb-8 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-4">
             <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl(`FolderView?id=${folderId}`))}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
             >
                <ArrowLeft className="w-5 h-5" />
             </Button>
             <div>
                <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-0.5">Knowledge Review</div>
                <h1 className="text-xl font-bold text-slate-700">
                  {currentCard?.title || 'Untitled Card'}
                </h1>
             </div>
          </div>
          
        </div>
        
        {/* Viewer */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
            {/* Main Viewer Area */}
            <div>
                 <CardViewer
                    cards={sortedCards}
                    currentIndex={currentIndex}
                    onIndexChange={setCurrentIndex}
                    onEdit={handleEdit}
                    onToggleUncertainty={handleToggleUncertainty}
                    onToggleBookmark={handleToggleBookmark}
                />
            </div>
            
             {/* Sidebar */}
            <div className="space-y-6 hidden lg:block">
                
                 {/* 1. Resistance Score (Primary Metric) */}
                <div className="bg-white rounded-3xl p-8 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-50">
                    <TooltipProvider>
                       <Tooltip>
                          <TooltipTrigger asChild>
                             <div className="cursor-default">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase flex items-center gap-2">
                                        <ShieldCheck className="w-3 h-3" />
                                        耐性スコア (Resistance)
                                    </div>
                                </div>
                                
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-5xl font-bold italic text-primary-600 transition-colors duration-500">
                                        {resistance}
                                    </span>
                                </div>
                                
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                                    <div 
                                        className="h-full rounded-full bg-primary-600 transition-all duration-700" 
                                        style={{ width: `${resistance}%` }}
                                    ></div>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                     <div className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100">
                                         {resistancePhase.label}
                                     </div>
                                     <div className="text-xs text-slate-400 font-medium">
                                        Interval: {intervalDays} days
                                     </div>
                                </div>
                             </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                             <p className="font-bold text-xs">{intervalDays} 日間の間隔に耐えています</p>
                          </TooltipContent>
                       </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Tags Sidebar Section */}
                {currentCard?.tags && currentCard.tags.length > 0 && (
                  <div className="bg-white rounded-3xl p-8 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)]">
                      <div className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase mb-4 flex items-center gap-2">
                        <Tag className="w-3 h-3" />
                        Tags
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentCard.tags.map((tag, i) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
