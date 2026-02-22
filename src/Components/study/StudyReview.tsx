import React from 'react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import StudyCard from '@/Components/study/StudyCard';

type Props = {
  currentCard: any;
  currentIndex: number;
  totalCards: number;
  onResult: (subjectiveScore: number, responseTime: number) => void;
  onToggleUncertainty: (card: any) => void;
  onToggleBookmark: (card: any) => void;
  showHard: boolean;
  showEasy: boolean;
  currentResistance: number;
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
  currentResistance,
}: Props) {
  return (
    <div className="reviewMain grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
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

      <div className="hidden lg:block space-y-6">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase mb-3 md:mb-4">耐性スコア</div>
          <div className="flex items-baseline gap-1 mb-3 md:mb-4">
            <span className="text-4xl md:text-5xl font-bold text-slate-800 italic">{currentResistance}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 rounded-full" style={{ width: `${currentResistance}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] min-h-[250px] md:min-h-[300px]">
          <div className="flex items-center justify-between mb-6">
            <div className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Active Links
            </div>
            <Button variant="ghost" size="sm" className="h-8 bg-slate-50 text-slate-500 text-xs rounded-full px-3 hover:bg-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              マップで見る
            </Button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <div className="text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-2">Association</div>
              <div className="font-bold text-slate-700">定義</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
