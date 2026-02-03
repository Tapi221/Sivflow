import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { Volume2 } from 'lucide-react';
import { Flashcard } from '../card/Flashcard';

export default function StudyCard({ 
  card,
  currentIndex,
  totalCards,
  onResult,
  onToggleUncertainty,
  showHard = true,
  showEasy = true
}) {
  const [studyPhase, setStudyPhase] = useState('timing'); // timing: 問題表示中, answer: 解答表示中
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  
  useEffect(() => {
    setStudyPhase('timing');
    setStartTime(Date.now());
    setElapsedTime(0);
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
  
  if (!card) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">学習するカードがありません</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      <Flashcard 
         card={card}
         isFlipped={studyPhase === 'answer'}
         onFlip={handleFlip}
         extraHeaderLeft={
            <Button size="icon" variant="ghost" className="rounded-full w-12 h-12 bg-slate-50 text-primary-600 hover:bg-primary-50 hover:text-primary-700">
                <Volume2 className="w-5 h-5" />
            </Button>
         }
         extraHeaderRight={
            <div className="flex flex-col items-end pointer-events-none mb-2">
                {(card.reviewCount !== undefined && card.reviewCount >= 0) && (
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 bg-slate-50/50 backdrop-blur-sm whitespace-nowrap tabular-nums font-bold">
                        {card.reviewCount + 1}回目の復習
                    </Badge>
                )}
            </div>
         }
         extraFooter={
            studyPhase === 'timing' && (
                <div className="text-center">
                    <p className="text-sm text-slate-400 animate-pulse">カードをクリックして解答を表示</p>
                </div>
            )
         }
         onToggleUncertainty={onToggleUncertainty}
      />

      {/* 回答ボタン（解答表示時のみ） */}
      {studyPhase === 'answer' && (
        <TooltipProvider delayDuration={0}>
          <div className="flex items-center justify-center gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* 0: 忘れた (赤) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                      className="w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-red-100 hover:bg-[#FFF5F6] flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
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
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center bg-slate-800 text-white border-slate-700">
                  <p>思い出せなかったカード。復習間隔はほぼリセットされ、しっかり復習が必要です。</p>
                </TooltipContent>
              </Tooltip>

              {/* 1: あいまい (黄) */}
              {showHard && (
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center bg-slate-800 text-white border-slate-700">
                      <p>覚えかけのカード。復習間隔は控えめに伸び、段階的に強化されます。</p>
                    </TooltipContent>
                  </Tooltip>
              )}

              {/* 2: 覚えた (青) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                      className="w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-blue-100 hover:bg-[#F0F9FF] flex flex-col items-center justify-center gap-1 md:gap-2 transition-all hover:-translate-y-1 active:scale-95 group"
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
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center bg-slate-800 text-white border-slate-700">
                  <p>正解したカード。少しずつ復習間隔が伸び、安定的に覚えられます。</p>
                </TooltipContent>
              </Tooltip>

              {/* 3: 余裕 (緑) */}
              {showEasy && (
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center bg-slate-800 text-white border-slate-700">
                      <p>簡単なカード。次回復習までの間隔を大きく伸ばせます。効率的に復習可能。</p>
                    </TooltipContent>
                  </Tooltip>
              )}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}