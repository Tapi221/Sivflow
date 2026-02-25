import React, { useState, useEffect, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Volume2 } from 'lucide-react';
import { Flashcard } from '../card/Flashcard';
import { MobileScalableCard } from '../card/MobileScalableCard';
import { CANONICAL_CARD_WIDTH, CARD_SAFE_PADDING_PX } from '../card/constants';
import { useUserSettings } from '@/hooks/useUserSettings';

export default function StudyCard({ 
  card,
  currentIndex,
  totalCards,
  onResult,
  onToggleUncertainty,
  onToggleBookmark,
  mode = 'review',
  showHard = true,
  showEasy = true
}) {
  const { settings } = useUserSettings();
  const isPracticeMode = mode === 'practice';
  const [studyPhase, setStudyPhase] = useState('timing'); // timing: 問題表示中, answer: 解答表示中
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const timerRef = useRef(null);

  const nextReviewLabel = React.useMemo(() => {
    const raw = card?.nextReviewDate ?? card?.next_review_date;
    if (!raw) return null;
    const date =
      typeof raw?.toDate === 'function'
        ? raw.toDate()
        : raw instanceof Date
          ? raw
          : new Date(raw);
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).format(date);
  }, [card?.nextReviewDate, card?.next_review_date]);
  
  useEffect(() => {
    setStudyPhase('timing');
    setStartTime(Date.now());
    setElapsedTime(0);
    setSwipeDir(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [card?.id]);
  
  useEffect(() => {
    if (studyPhase === 'timing' && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [studyPhase, startTime]);
  
  const handleShowAnswer = () => {
    setStudyPhase('answer');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
  
  const handleResult = (subjectiveScore) => {
    const responseTime = elapsedTime;
    if (onResult) {
      onResult(subjectiveScore, responseTime);
    }
  };

  const handleFlip = () => {
    if (studyPhase === 'timing') {
      handleShowAnswer();
    } else {
      setStudyPhase('timing');
    }
  };

  // スワイプ設定
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (studyPhase === 'answer') {
        handleResult(isPracticeMode ? 'ok' : 2); // 覚えた / OK
      }
    },
    onSwipedRight: () => {
      if (studyPhase === 'answer') {
        handleResult(isPracticeMode ? 'anxious' : 0); // 忘れた / 不安
      }
    },
    onSwiping: (e) => {
      if (studyPhase === 'answer') {
        setSwipeDir(e.dir);
      }
    },
    onSwiped: () => setSwipeDir(null),
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  const renderPracticeButtons = () => (
    <div className="reviewRatingBar flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        className={`w-24 h-20 md:w-28 md:h-24 rounded-2xl bg-white border shadow-sm flex flex-col items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-95 group ${
          swipeDir === 'Right' ? 'border-red-500 bg-red-50 scale-105' : 'border-slate-100'
        }`}
        onClick={(e) => { e.stopPropagation(); handleResult('anxious'); }}
      >
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-red-50 flex items-center justify-center text-[#FF5A65] group-hover:scale-110 transition-transform">
          <svg width="18" height="18" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="15" x2="16" y2="15" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <span className="text-xs md:text-sm font-bold text-slate-600 group-hover:text-[#FF5A65]">不安</span>
      </button>

      <button
        className={`w-24 h-20 md:w-28 md:h-24 rounded-2xl bg-white border shadow-sm flex flex-col items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-95 group ${
          swipeDir === 'Left' ? 'border-blue-500 bg-blue-50 scale-105' : 'border-slate-100'
        }`}
        onClick={(e) => { e.stopPropagation(); handleResult('ok'); }}
      >
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#00A3FF] group-hover:scale-110 transition-transform">
          <svg width="18" height="18" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <span className="text-xs md:text-sm font-bold text-slate-600 group-hover:text-[#00A3FF]">OK</span>
      </button>
    </div>
  );

  const renderReviewButtons = () => (
      <div className="reviewRatingBar flex items-center justify-center gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* 0: 忘れた (赤) */}
          <button
              className={`w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border shadow-sm flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group ${
                swipeDir === 'Right' ? 'border-red-500 bg-red-50 scale-105' : 'border-slate-100'
              }`}
              onClick={(e) => { e.stopPropagation(); handleResult(0); }}
          >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-50 flex items-center justify-center text-[#FF5A65] group-hover:scale-110 transition-transform">
                  <svg width="18" height="18" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" stroke="none" />
                      <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-slate-600 group-hover:text-[#FF5A65]">忘れた</span>
          </button>

          {/* 1: あいまい (黄) */}
          {showHard && (
              <button
                  className="w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-amber-100 hover:bg-[#FFFBF0] flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
                  onClick={(e) => { e.stopPropagation(); handleResult(1); }}
              >
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-50 flex items-center justify-center text-[#F9A825] group-hover:scale-110 transition-transform">
                      <svg width="18" height="18" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="8" y1="15" x2="16" y2="15" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                      </svg>
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-600 group-hover:text-[#F9A825]">あいまい</span>
              </button>
          )}

          {/* 2: 覚えた (青) */}
          <button
              className={`w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border shadow-sm flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group ${
                swipeDir === 'Left' ? 'border-blue-500 bg-blue-50 scale-105' : 'border-slate-100'
              }`}
              onClick={(e) => { e.stopPropagation(); handleResult(2); }}
          >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#00A3FF] group-hover:scale-110 transition-transform">
                  <svg width="18" height="18" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-slate-600 group-hover:text-[#00A3FF]">覚えた</span>
          </button>

          {/* 3: 余裕 (緑) */}
          {showEasy && (
              <button
                  className="w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-emerald-100 hover:bg-[#EEFDF6] flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
                  onClick={(e) => { e.stopPropagation(); handleResult(3); }}
              >
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-50 flex items-center justify-center text-[#00B67A] group-hover:scale-110 transition-transform">
                      <svg width="18" height="18" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 13s1.5 3 4 3 4-3 4-3" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                      </svg>
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-600 group-hover:text-[#00B67A]">余裕</span>
              </button>
          )}
      </div>
  );
  
  if (!card) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">学習するカードがありません</p>
      </div>
    );
  }
  
  return (
    <div className="reviewStudyCard flex flex-col gap-6 w-full mx-auto max-w-[520px]">
      <div className="reviewCardViewport">
        <div className={`transition-all duration-200 ${
          swipeDir === 'Left' ? 'opacity-50 -translate-x-4 border-blue-400' : 
          swipeDir === 'Right' ? 'opacity-50 translate-x-4 border-red-400' : ''
        }`} {...handlers}>
          <MobileScalableCard cardDesignWidth={CANONICAL_CARD_WIDTH} safePadding={CARD_SAFE_PADDING_PX}>
            <Flashcard 
              card={card}
              isFlipped={studyPhase === 'answer'}
              onFlip={handleFlip}
              editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
              extraHeaderLeft={
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full w-8 h-8 md:w-9 md:h-9 min-w-0 min-h-0 bg-slate-50 text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                >
                  <Volume2 className="w-4 h-4 md:w-5 h-5" />
                </Button>
              }
              extraHeaderRight={
                <div className="flex flex-col items-end pointer-events-none mb-2">
                  {(card.reviewCount !== undefined && card.reviewCount >= 0) && (
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 bg-slate-50/50 backdrop-blur-sm whitespace-nowrap tabular-nums font-bold">
                      {card.reviewCount + 1}回目の復習
                    </Badge>
                  )}
                  {nextReviewLabel && (
                    <Badge variant="outline" className="mt-1 text-[10px] text-slate-500 border-slate-200 bg-white/70 backdrop-blur-sm whitespace-nowrap font-semibold">
                      次回学習日 {nextReviewLabel}
                    </Badge>
                  )}
                </div>
              }
              extraFooter={
                studyPhase === 'timing' && (
                  <div className="text-center">
                    <p className="text-sm text-slate-400 animate-pulse">カードをクリックまたはスワイプして解答を表示</p>
                  </div>
                )
              }
              onToggleUncertainty={onToggleUncertainty}
              onToggleBookmark={onToggleBookmark}
            />
          </MobileScalableCard>
        </div>
      </div>

      {/* 解答ボタン（解答表示時のみ） */}
      {studyPhase === 'answer' && (
        isPracticeMode ? renderPracticeButtons() : renderReviewButtons()
      )}
    </div>
  );
}
