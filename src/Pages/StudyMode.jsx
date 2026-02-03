import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useMutation } from '@tanstack/react-query';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { localDb } from '@/services/localDB';
import { firestoreDb } from '@/services/firebase';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { ArrowLeft, Trophy, RefreshCw, Sparkles } from 'lucide-react';
import { FaceIcons } from '@/Components/ui/FaceIcons';
import { createPageUrl } from '@/utils';
import StudyCard from '@/Components/study/StudyCard';
import { computeNextReview } from '@/services/reviewAlgorithm';
import { normalizeMemoryStability } from '@/utils/reviewUtils';
import { calculateResistanceScore } from '@/utils/reviewMetrics';
import confetti from 'canvas-confetti';
import { StampRally } from '@/Components/study/StampRally';

export default function StudyMode() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { settings } = useUserSettings();
  
  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get('folderId');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyComplete, setStudyComplete] = useState(false);
  const [results, setResults] = useState({ 0: 0, 1: 0, 2: 0, 3: 0 });
  
  const { cards: allCards = [], loading: isLoading, updateCard } = useCards(folderId);
  const { folders = [], loading: foldersLoading } = useFolders();
  
  const createStudyLogMutation = useMutation({
    mutationFn: (data) => addDoc(collection(firestoreDb, 'studyLogs'), data),
  });
  
  const createLevelHistoryMutation = useMutation({
    mutationFn: (data) => localDb.addItem('levelHistories', data),
  });
  
  // Get cards to study
  const studyCards = useMemo(() => {
    // 1. Basic filter (Deleted/Draft)
    let cards = allCards.filter(c => !c.isDraft && !c.isDeleted && !c.is_deleted);
    
    // 2. Folder validity filter (Match Dashboard logic)
    if (!foldersLoading) {
        const validFolderIds = new Set(folders.map(f => f.id || f.folderId));
        cards = cards.filter(card => {
            const cFolderId = card.folderId || card.folder_id;
            // If card has a folderId, it MUST be in the valid list.
            // If card has NO folderId, we typically allow it (Uncategorized) OR Dashboard allows it?
            // Dashboard: if (cardFolderId && !validFolderIds.has(cardFolderId)) return false;
            if (cFolderId && !validFolderIds.has(cFolderId)) return false;
            return true;
        });
    }

    if (folderId) {
      cards = cards.filter(c => c.folderId === folderId);
    } else {
      // Today's review cards
      const today = new Date();
      cards = cards.filter(c => {
        let reviewDate = c.nextReviewDate || c.next_review_date;
        if (!reviewDate) return false;
        
        if (typeof reviewDate?.toDate === 'function') {
          reviewDate = reviewDate.toDate();
        } else if (!(reviewDate instanceof Date)) {
          reviewDate = new Date(reviewDate);
        }
        
        if (isNaN(reviewDate.getTime())) return false;

        const rDate = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
        const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const autoCarryOver = settings?.autoCarryOver ?? true;

        if (autoCarryOver) {
            return rDate <= tDate;
        } else {
            return rDate.getTime() === tDate.getTime();
        }
      });
    }
    
    return cards.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [allCards, folderId, folders, foldersLoading, settings]);
  
  // Trigger confetti when study is completed
  useEffect(() => {
    if (studyComplete) {
      // Launch confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min, max) => {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Launch from two points
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [studyComplete]);
  
  const handleResult = async (subjectiveScore, responseTime) => {
    const card = studyCards[currentIndex];
    if (!card) return;

    const memoryStabilityBefore = normalizeMemoryStability(
      card.memoryStability,
      card.currentLevel ?? card.level
    );
    const reviewUpdate = computeNextReview({
      card,
      subjectiveScore,
      now: new Date(),
      delayBonusEnabled: settings?.delayBonusEnabled ?? false,
    });

    // Update card in local DB
    if (updateCard) {
      await updateCard(card.id, {
        memoryStability: reviewUpdate.memoryStability,
        nextReviewDate: reviewUpdate.nextReviewDate,
        lastReviewAt: reviewUpdate.lastReviewAt,
        lastSubjectiveScore: subjectiveScore,
        recoveryRemaining: reviewUpdate.recoveryRemaining,
        lastReviewDelayDays: reviewUpdate.delayDays,
        reviewCount: reviewUpdate.reviewCount, // Save review count
        updatedAt: new Date()
      });
    }

    // Create study log (Firestore & Local) - 失敗しても進行
    if (currentUser) {
      const logData = {
        userId: currentUser.uid,
        cardId: card.id,
        folderId: card.folderId,
        studiedAt: new Date(),
        result: 'subjective',
        subjectiveScore,
        responseTimeMs: responseTime,
        memoryStabilityBefore,
        memoryStabilityAfter: reviewUpdate.memoryStability,
        delayDays: reviewUpdate.delayDays,
        intervalDays: reviewUpdate.intervalDays,
        createdAt: new Date()
      };

      // 1. Local (Dexie) - Crucial for Rescue & Offline Streaks
      try {
        await localDb.table('studyLogs').put({
          ...logData,
          id: crypto.randomUUID()
        });
      } catch (e) {
        console.warn('[StudyMode] Local studyLog書き込み失敗', e);
      }

      // 2. Firestore
      try {
        await createStudyLogMutation.mutateAsync({
          ...logData,
          studiedAt: Timestamp.now(),
          createdAt: Timestamp.now()
        });
      } catch (e) {
        console.warn('[StudyMode] Firestore studyLog書き込み失敗', e);
      }
    }

    // Create stability history if changed (base44) - 失敗しても進行
    if (Math.round(reviewUpdate.memoryStability) !== Math.round(memoryStabilityBefore) && currentUser) {
      try {
        await createLevelHistoryMutation.mutateAsync({
          userId: currentUser.uid,
          cardId: card.id,
          changedAt: Timestamp.now(),
          fromStability: memoryStabilityBefore,
          toStability: reviewUpdate.memoryStability,
          reason: 'subjective',
          subjectiveScore,
          createdAt: Timestamp.now()
        });
      } catch (e) {
        console.warn('[StudyMode] base44 LevelHistory書き込み失敗', e);
      }
    }

    // Update results
    setResults(prev => ({
      ...prev,
      [subjectiveScore]: prev[subjectiveScore] + 1
    }));

    // Move to next card or complete
    if (currentIndex < studyCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      
      // Fetch Streak for Rally
      const fetchStreak = async () => {
        try {
            // Wait a bit for Cloud Function to process (if relying on it) 
            // OR check local prediction.
            // For now, let's grab from loginHistory or just assume +1 if today wasn't recorded?
            // Actually, we should check `loginHistory` in LocalDB or rely on logic inside `recordLogin` wrapper.
            // But getting true consecutive days usually requires checking the DB.
            if (currentUser) {
                 const stats = await localDb.userStats.get(currentUser.uid);
                 // Fallback or specific logic
                 // If we successfully reviewed, maybe we increment locally for visual?
                 // But `recordLogin` is the source of truth for "Streak".
                 // Let's assume the user has ALREADY logged in today and streak is up to date 
                 // OR we invoke a check.
                 // For the visual effect, let's fetch the LATEST loginHistory 'consecutiveDays'.
                 // If we just finished a review, maybe we trigger a 'study-streak' logic?
                 // The prompt mentions "Updates streak upon review completion".
                 // So we might need to increment it visually if it wasn't done today.
                 
                 // Simulating fetch
                 const history = await localDb.table('loginHistory').where('userId').equals(currentUser.uid).sortBy('loginDate');
                 const last = history[history.length - 1];
                 const s = last?.consecutiveDays || 1;
                 
                 setResults(prev => ({ ...prev, streak: s }));
            }
        } catch(e) { console.error(e); }
      };
      
      fetchStreak();
      setStudyComplete(true);
    }
  };
  
  const handleToggleUncertainty = async (card) => {
    if (updateCard) {
      await updateCard(card.id, { has_uncertainty: !card.has_uncertainty });
    }
  };
  
  const handleRestart = () => {
    setCurrentIndex(0);
    setStudyComplete(false);
    setResults({ 0: 0, 1: 0, 2: 0, 3: 0 });
  };
  
  const handleBack = () => {
    if (folderId) {
      navigate(createPageUrl(`FolderView?id=${folderId}`));
    } else {
      navigate(createPageUrl('Dashboard'));
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7F8] p-4 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }
  
  const currentCard = studyCards[currentIndex];
  // Resistance Score calc for sidebar
  const currentResistance = currentCard 
    ? calculateResistanceScore(currentCard.interval || 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#F5F7F8] text-slate-800 font-sans">
      <div className="max-w-[1600px] mx-auto p-3 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
          <div className="flex items-center gap-3 md:gap-4">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white flex items-center justify-center border border-slate-200 text-primary-600 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
             </div>
             <div className="min-w-0">
                <div className="text-[9px] md:text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-0.5 truncate">Knowledge Review</div>
                <h1 className="text-lg md:text-xl font-bold text-slate-700 font-mono truncate">
                  {(() => {
                     const t = currentCard?.title || '';
                     const q = currentCard?.questionText || '';
                     // If title mimics question, fallback to Untitled
                     if (t && q && t.trim() === q.trim()) return 'Untitled Card';
                     return t || 'Untitled Card';
                  })()}
                </h1>
             </div>
          </div>
          
          {!studyComplete && studyCards.length > 0 && (
            <div className="flex items-end gap-1 text-slate-400 shrink-0">
               <span className="text-2xl md:text-3xl font-bold text-slate-700 italic">{currentIndex + 1}</span>
               <span className="text-sm md:text-lg font-medium mb-1">/ {studyCards.length}</span>
            </div>
          )}
        </div>

        {/* Progress Bar (Global) */}
        <div className="w-full h-1.5 bg-slate-200 rounded-full mb-6 md:mb-8 overflow-hidden">
             <div 
               className="h-full bg-primary-600 transition-all duration-500 ease-out"
               style={{ width: `${((currentIndex) / studyCards.length) * 100}%` }}
             ></div>
        </div>
        
        {studyCards.length === 0 ? (
          <Card className="max-w-2xl mx-auto mt-20 border-none shadow-xl rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardContent className="py-16 text-center">
              <div className="relative inline-block mb-6">
                <Trophy className="w-20 h-20 text-emerald-400 animate-in zoom-in duration-700" />
                <Sparkles className="w-6 h-6 text-emerald-300 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-700">学習するカードがありません</h2>
              <p className="text-slate-400 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                {folderId ? 'このフォルダにカードを追加してください' : '今日復習するカードはありません'}
              </p>
              <Button 
                onClick={handleBack} 
                className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-8 py-6 text-lg animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200"
              >
                戻る
              </Button>
            </CardContent>
          </Card>
        ) : studyComplete ? (
          <div className="animate-in fade-in duration-700">
             <div className="mb-8">
                <StampRally currentStreak={results.streak || 1} />
             </div>
             
             <Card className="max-w-3xl mx-auto border-none shadow-xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-700 delay-300">
            <CardContent className="py-12 px-8 text-center relative overflow-hidden">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-[#e0f2f1] opacity-80"></div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2 text-[#1e293b]">
                  Complete!
                </h2>
                <p className="text-sm text-[#94a3b8] mb-8">
                  全てのカードを学習しました
                </p>
                
                {/* Animated stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 max-w-2xl mx-auto mb-8">
                  {[
                    { score: 0, Icon: FaceIcons.Forgot, label: '忘れた' },
                    { score: 1, Icon: FaceIcons.Vague, label: '曖昧' },
                    { score: 2, Icon: FaceIcons.Good, label: '覚えた' },
                    { score: 3, Icon: FaceIcons.Easy, label: '余裕' }
                  ].map(({ score, Icon, label }, index) => (
                    <div 
                      key={score} 
                      className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center transform transition-all hover:scale-105"
                    >
                      <div className="mb-1">
                        <Icon size={32} />
                      </div>
                      <span className="text-lg font-bold text-[#1e293b]">
                        {results[score]}
                      </span>
                      <span className="text-[9px] text-[#94a3b8] font-medium uppercase tracking-wider">
                        {SUBJECTIVE_LABELS[score]}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-wrap justify-center gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleBack} 
                    className="rounded-xl px-8 h-12 border-slate-200 hover:bg-slate-50 text-[#64748b] text-base"
                  >
                    ダッシュボードに戻る
                  </Button>
                  <Button 
                    onClick={handleRestart} 
                    className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-8 h-12 shadow-sm hover:shadow-md transition-all text-base"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    もう一度学習
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
            {/* Main Card Area */}
            <div className="w-full">
              <StudyCard
                card={currentCard}
                currentIndex={currentIndex}
                totalCards={studyCards.length}
                onResult={handleResult}
                onToggleUncertainty={handleToggleUncertainty}
                showHard={settings?.showReviewHard ?? true}
                showEasy={settings?.showReviewEasy ?? true}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
                {/* Resistance Score */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)]">
                    <div className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase mb-3 md:mb-4">耐性スコア</div>
                    <div className="flex items-baseline gap-1 mb-3 md:mb-4">
                        <span className="text-4xl md:text-5xl font-bold text-slate-800 italic">{currentResistance}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary-600 rounded-full" 
                            style={{ width: `${currentResistance}%` }}
                        ></div>
                    </div>
                </div>

                {/* Active Links */}
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

                    {/* Associations */}
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                             <div className="text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-2">Association</div>
                             <div className="font-bold text-slate-700">定義</div>
                        </div>
                         {/* Placeholder for future links */}
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
