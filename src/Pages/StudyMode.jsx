import React, { useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useMutation } from '@tanstack/react-query';
import { addDoc, collection } from 'firebase/firestore';
import { getLocalDb } from '../services/localDB';
import { firestoreDb } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/Components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { FaceIcons } from '@/Components/ui/FaceIcons';
import { createPageUrl } from '@/utils';
import { calculateResistanceScore } from '@/utils/reviewMetrics';
import { getDebugStreak } from '@/utils/debugStreak';
import { sanitizeStreak } from '@/utils/streak';
import { flags } from '@/features/flags';
import { TelemetryService } from '@/services/logic/TelemetryService';
import confetti from 'canvas-confetti';
import { StampRally } from '@/Components/study/StampRally';
import { useStudyCards } from '@/hooks/useStudyCards';
import { useStudySession } from '@/hooks/useStudySession';
import { usePracticeMode } from '@/hooks/usePracticeMode';
import { StudyEmpty } from '@/Components/study/StudyEmpty';
import { StudyReview } from '@/Components/study/StudyReview';
import { StudyComplete } from '@/Components/study/StudyComplete';
import { PracticeCards } from '@/Components/study/PracticeCards';
import { PracticeSummary } from '@/Components/study/PracticeSummary';

const RATING_LABELS = {
  forgot: '忘れた',
  vague: 'あいまい',
  remembered: '覚えた',
  easy: '余裕',
};

const RATING_TILES = [
  { rating: 'forgot', score: 0, Icon: FaceIcons.Forgot },
  { rating: 'vague', score: 1, Icon: FaceIcons.Vague },
  { rating: 'remembered', score: 2, Icon: FaceIcons.Good },
  { rating: 'easy', score: 3, Icon: FaceIcons.Easy },
];

export default function StudyMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { settings } = useUserSettings();

  const folderId = useMemo(() => new URLSearchParams(location.search).get('folderId'), [location.search]);

  const isDev = useMemo(() => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) return true;
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') return true;
    return false;
  }, []);

  const previewStampRally = useMemo(() => {
    if (!isDev) return false;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(location.search).get('previewStampRally') === '1';
  }, [isDev, location.search]);

  const { cards: allCards = [], loading: isLoading, updateCard } = useCards(folderId);
  const { folders = [], loading: foldersLoading } = useFolders();
  const { updateFolder } = useFolders();

  const isPracticeFeatureEnabled = flags.isEnabled('postReviewPractice');
  const isAdvancedTelemetryEnabled = flags.isEnabled('ENABLE_ADVANCED_TELEMETRY');
  const telemetry = useMemo(() => new TelemetryService(), []);

  const { studyCards, cardById } = useStudyCards({
    folderId,
    allCards,
    folders,
    foldersLoading,
    settings,
  });

  const createStudyLogMutation = useMutation({
    mutationFn: (data) => {
      if (!firestoreDb) return Promise.resolve(null);
      return addDoc(collection(firestoreDb, 'studyLogs'), data);
    },
  });

  const createLevelHistoryMutation = useMutation({
    mutationFn: async (data) => {
      const localDb = await getLocalDb(currentUser?.uid);
      return localDb.addItem('levelHistories', data);
    },
  });

  const {
    currentIndex,
    studyComplete,
    setStudyComplete,
    results,
    safeSessionResults,
    sourceSessionId,
    handleResult,
  } = useStudySession({
    studyCards,
    updateCard,
    currentUser,
    settings,
    createStudyLogMutation,
    createLevelHistoryMutation,
  });

  const debugStreak = getDebugStreak();
  const effectiveStreak = debugStreak ?? sanitizeStreak(results?.streak);
  const stampRallyStreak = studyComplete && debugStreak === null
    ? Math.max(1, effectiveStreak)
    : effectiveStreak;

  const finalRatingByCardId = useMemo(() => {
    const finalByCardId = new Map();
    for (const result of safeSessionResults) {
      if (result?.cardId) finalByCardId.set(result.cardId, result.rating);
    }
    return finalByCardId;
  }, [safeSessionResults]);

  const ratingCounts = useMemo(() => {
    const counts = { forgot: 0, vague: 0, remembered: 0, easy: 0 };
    for (const rating of finalRatingByCardId.values()) {
      if (Object.prototype.hasOwnProperty.call(counts, rating)) counts[rating] += 1;
    }
    return counts;
  }, [finalRatingByCardId]);

  const logPracticeEvent = useCallback((eventName, context = {}) => {
    if (!isAdvancedTelemetryEnabled) return;
    telemetry.log('info', eventName, {
      event: eventName,
      userId: currentUser?.uid,
      sourceSessionId,
      ...context,
    });
  }, [currentUser?.uid, isAdvancedTelemetryEnabled, sourceSessionId, telemetry]);

  const {
    practiceState,
    isPracticeMode,
    handleStartPractice,
    handlePracticeAnswer,
    handlePracticeContinueRound,
    handlePracticeExit,
  } = usePracticeMode({
    finalRatingByCardId,
    sourceSessionId,
    isPracticeFeatureEnabled,
    logPracticeEvent,
  });

  useEffect(() => {
    const updateLastAccess = async () => {
      if (!folderId || !updateFolder) return;
      await updateFolder(folderId, { lastAccessAt: new Date() });
    };
    updateLastAccess();
  }, [folderId, updateFolder]);

  useEffect(() => {
    if (!studyComplete) return;
    const timeoutId = window.setTimeout(() => {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [studyComplete]);

  const handleToggleUncertainty = async (card) => {
    if (!updateCard || !card?.id) return;
    await updateCard(card.id, { hasUncertainty: !card.hasUncertainty });
  };

  const handleToggleBookmark = async (card) => {
    if (!updateCard || !card?.id) return;
    const current = Boolean(card.isBookmarked ?? card.is_bookmarked);
    await updateCard(card.id, { isBookmarked: !current });
  };

  const handleBack = () => {
    if (practiceState) {
      handlePracticeExit('back_button');
      return;
    }
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

  const practiceCurrentCardId = isPracticeMode && practiceState?.phase === 'cards'
    ? practiceState.roundQueue[0]
    : null;
  const practiceCurrentCard = practiceCurrentCardId ? cardById.get(practiceCurrentCardId) : null;
  const currentCard = isPracticeMode ? practiceCurrentCard : studyCards[currentIndex];
  const currentResistance = currentCard ? calculateResistanceScore(currentCard.interval || 0) : 0;

  const progressPercent = (() => {
    if (studyCards.length === 0) return 0;
    if (isPracticeMode && practiceState) {
      const done = (practiceState.roundTotal ?? 0) - (practiceState.roundQueue?.length ?? 0);
      return (done / (practiceState.roundTotal || 1)) * 100;
    }
    if (studyComplete) return 100;
    return (currentIndex / studyCards.length) * 100;
  })();

  const showCounter = isPracticeMode
    ? practiceState?.phase === 'cards' && (practiceState?.roundTotal ?? 0) > 0
    : !studyComplete && studyCards.length > 0;

  const counterCurrent = isPracticeMode
    ? Math.min(
      practiceState?.roundTotal ?? 0,
      (practiceState?.roundTotal ?? 0) - (practiceState?.roundQueue?.length ?? 0) + 1
    )
    : currentIndex + 1;

  const counterTotal = isPracticeMode ? (practiceState?.roundTotal ?? 0) : studyCards.length;
  const isCompletionView = !isPracticeMode && studyComplete && studyCards.length > 0;

  return (
    <div
      data-page="review"
      className={`reviewPage bg-[#F5F7F8] text-slate-800 font-serif ${isCompletionView ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}
    >
      <div className={`reviewShell max-w-[1600px] mx-auto p-3 ${isCompletionView ? 'md:py-4 md:px-8 h-full flex flex-col' : 'md:p-8'}`}>
        {!isCompletionView && (
          <div className={`reviewHeader flex items-center justify-between px-2 ${isCompletionView ? 'mb-3 md:mb-4' : 'mb-4 md:mb-6'}`}>
            <div className="flex items-center gap-3 md:gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="reviewBackButton w-11 h-11 rounded-xl bg-white flex items-center justify-center border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shrink-0"
                aria-label="戻る"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="reviewMeta text-[9px] md:text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-0.5 truncate">
                  {isPracticeMode ? `追い復習 ROUND ${practiceState.roundNumber}` : 'Knowledge Review'}
                </div>
                <h1 className="reviewTitle text-lg md:text-xl font-bold text-slate-700 font-mono truncate">
                  {(() => {
                    const t = currentCard?.title || '';
                    const q = currentCard?.questionText || '';
                    if (t && q && t.trim() === q.trim()) return t;
                    return t || 'Untitled Card';
                  })()}
                </h1>
              </div>
            </div>

            {showCounter && (
              <div className="flex items-end gap-1 text-slate-400 shrink-0">
                <span className="text-2xl md:text-3xl font-bold text-slate-700 italic">{counterCurrent}</span>
                <span className="text-sm md:text-lg font-medium mb-1">/ {counterTotal}</span>
              </div>
            )}
          </div>
        )}

        <div className={`reviewProgress w-full h-1.5 bg-slate-200 rounded-full overflow-hidden ${isCompletionView ? 'mb-4 md:mb-5' : 'mb-6 md:mb-8'}`}>
          <div className="h-full bg-primary-600 transition-all duration-500 ease-out" style={{ width: `${Math.max(0, Math.min(100, progressPercent || 0))}%` }} />
        </div>

        {previewStampRally && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white/95 p-4">
            <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">DEV: StampRally Preview</div>
            <StampRally currentStreak={effectiveStreak} />
          </div>
        )}

        <div className={isCompletionView ? 'flex-1 min-h-0 overflow-hidden' : ''}>
          {studyCards.length === 0 ? (
            <StudyEmpty folderId={folderId} navigate={navigate} handleBack={handleBack} />
          ) : isPracticeMode ? (
            practiceState.phase === 'summary' ? (
              <PracticeSummary
                practiceState={practiceState}
                handlePracticeContinueRound={handlePracticeContinueRound}
                handlePracticeExit={handlePracticeExit}
                ratingLabels={RATING_LABELS}
              />
            ) : (
              <PracticeCards
                practiceState={practiceState}
                practiceCurrentCard={practiceCurrentCard}
                counterCurrent={counterCurrent}
                counterTotal={counterTotal}
                handlePracticeAnswer={handlePracticeAnswer}
                handleToggleUncertainty={handleToggleUncertainty}
                handlePracticeExit={handlePracticeExit}
                ratingLabels={RATING_LABELS}
              />
            )
          ) : studyComplete ? (
            <StudyComplete
              stampRallyStreak={stampRallyStreak}
              ratingTiles={RATING_TILES}
              ratingCounts={ratingCounts}
              isPracticeFeatureEnabled={isPracticeFeatureEnabled}
              results={results}
              ratingLabels={RATING_LABELS}
              handleStartPractice={handleStartPractice}
              navigate={navigate}
              compact
            />
          ) : (
            <StudyReview
              currentCard={currentCard}
              currentIndex={currentIndex}
              totalCards={studyCards.length}
              onResult={handleResult}
              onToggleUncertainty={handleToggleUncertainty}
              onToggleBookmark={handleToggleBookmark}
              showHard={settings?.showReviewHard ?? true}
              showEasy={settings?.showReviewEasy ?? true}
              currentResistance={currentResistance}
            />
          )}
        </div>
      </div>
    </div>
  );
}
