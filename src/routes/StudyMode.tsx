import React, { useMemo, useEffect, useCallback, useState } from "react";
import type { Card, Folder } from "@/types";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useMutation } from "@tanstack/react-query";
import { addDoc, collection } from "firebase/firestore";
import { getLocalDb } from "@/services/localDB";
import { firestoreDb } from "@/services/firebase";
import { useAuthSession } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "@/ui/icons";
import { createPageUrl } from "@/platform/web/navigation/toWebPath";
import { getDebugStreak } from "@/utils/debugStreak";
import { sanitizeStreak } from "@/utils/streak";
import { flags } from "@/features/flags";
import { TelemetryService } from "@/services/logic/TelemetryService";
import confetti from "canvas-confetti";
import { useStudyCards } from "@/hooks/study/useStudyCards";
import { useStudySession } from "@/hooks/study/useStudySession";
import { usePracticeMode } from "@/hooks/study/usePracticeMode";
import { StudyEmpty } from "@/features/study/StudyEmpty";
import { StudyReview } from "@/features/study/StudyReview";
import { StudyComplete } from "@/features/study/StudyComplete";
import { PracticeCards } from "@/features/study/PracticeCards";
import { PracticeSummary } from "@/features/study/PracticeSummary";
import { getCardText } from "@/domain/card/content";
import type { PracticeFilterRating } from "@/hooks/study/usePracticeMode";

type StudyLogPayload = {
  userId: string;
  cardId: string;
  folderId?: string;
  subjectiveScore: number;
  responseTime: number;
  createdAt: unknown;
};

type PersistedStudySession = {
  cardIds: string[];
  savedAt: number;
};

const RATING_LABELS: Record<PracticeFilterRating, string> = {
  forgot: "忘れた",
  vague: "あいまい",
  remembered: "覚えた",
  easy: "余裕",
};

const RATING_TILES = [
  { rating: "forgot" as const, score: 0, Icon: null },
  { rating: "vague" as const, score: 1, Icon: null },
  { rating: "remembered" as const, score: 2, Icon: null },
  { rating: "easy" as const, score: 3, Icon: null },
];

const StudyMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthSession();
  const { settings } = useUserSettings();

  const folderId = useMemo(
    () => new URLSearchParams(location.search).get("folderId"),
    [location.search],
  );
  const SESSION_KEY = folderId ? `manifolmia_session_${folderId}` : null;

  useEffect(() => {
    // StudyMode は集中フローなので「ページスクロール」を殺す。
    // 大規模アプリ想定で ref-counting（他画面と競合しても剥がしすぎない）。
    const root = document.documentElement;
    const prev = Number(root.dataset.noPageScrollCount || "0");
    const next = prev + 1;
    root.dataset.noPageScrollCount = String(next);
    root.classList.add("no-page-scroll");
    return () => {
      const current = Number(root.dataset.noPageScrollCount || "1") - 1;
      if (current <= 0) {
        delete root.dataset.noPageScrollCount;
        root.classList.remove("no-page-scroll");
      } else {
        root.dataset.noPageScrollCount = String(current);
      }
    };
  }, []);

  const {
    cards: allCards = [],
    loading: isLoading,
    updateCard,
  } = useCards(folderId);
  const { folders = [], loading: foldersLoading } = useFolders();
  const { updateFolder } = useFolders();

  const isPracticeFeatureEnabled = flags.isEnabled("postReviewPractice");
  const isAdvancedTelemetryEnabled = flags.isEnabled(
    "ENABLE_ADVANCED_TELEMETRY",
  );
  const telemetry = useMemo(() => new TelemetryService(), []);

  const { studyCards: dueStudyCards } = useStudyCards({
    folderId,
    allCards,
    folders,
    foldersLoading,
    settings,
  });
  const [sessionSeedCards, setSessionSeedCards] = useState<Card[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSessionSeedCards([]);
    });
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (sessionSeedCards.length > 0) return;
      if (dueStudyCards.length === 0) return;

      if (SESSION_KEY) {
        try {
          const raw = localStorage.getItem(SESSION_KEY);
          if (raw) {
            const data = JSON.parse(raw) as PersistedStudySession;
            const isRecent = Date.now() - data.savedAt < 24 * 60 * 60 * 1000;
            if (isRecent && Array.isArray(data.cardIds)) {
              const dueById = new Map<string, Card>(
                dueStudyCards.map((card) => [card.id, card]),
              );
              const remaining = data.cardIds
                .map((id: string) => dueById.get(id))
                .filter((card): card is Card => Boolean(card));
              // 一部のカードが既にレビュー済み（残りが元より少ない）場合のみ復元
              if (
                remaining.length > 0 &&
                remaining.length < data.cardIds.length
              ) {
                setSessionSeedCards(remaining);
                return;
              }
            }
            localStorage.removeItem(SESSION_KEY);
          }
        } catch {
          if (SESSION_KEY) localStorage.removeItem(SESSION_KEY);
        }
      }

      setSessionSeedCards(dueStudyCards);
    });

    return () => {
      cancelled = true;
    };
  }, [dueStudyCards, sessionSeedCards.length, SESSION_KEY]);

  const allCardsById = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of allCards) {
      if (card?.id) map.set(card.id, card);
    }
    return map;
  }, [allCards]);

  const studyCards = useMemo(() => {
    if (sessionSeedCards.length === 0) return dueStudyCards;
    return sessionSeedCards
      .map((seedCard) => allCardsById.get(seedCard.id) ?? seedCard)
      .filter(Boolean);
  }, [allCardsById, dueStudyCards, sessionSeedCards]);

  const studyCardById = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of studyCards) {
      if (card?.id) map.set(card.id, card);
    }
    return map;
  }, [studyCards]);

  const createStudyLogMutation = useMutation<unknown, Error, StudyLogPayload>({
    mutationFn: (data: StudyLogPayload) => {
      if (!firestoreDb) return Promise.resolve(null);
      return addDoc(collection(firestoreDb, "studyLogs"), data);
    },
  });

  const createLevelHistoryMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const localDb = await getLocalDb(currentUser?.uid);
      return localDb.addItem("levelHistories", data);
    },
  });

  const {
    currentIndex,
    studyComplete,
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

  // カードを1枚以上レビューしたら進捗を保存（currentIndex が進むたびに更新）
  // 復元時は cardIds のうち dueStudyCards に残っているものだけを使う（自動的に続きになる）
  useEffect(() => {
    if (
      !SESSION_KEY ||
      sessionSeedCards.length === 0 ||
      studyComplete ||
      currentIndex === 0
    )
      return;
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        cardIds: sessionSeedCards.map((c) => c.id),
        savedAt: Date.now(),
      }),
    );
  }, [currentIndex, SESSION_KEY, sessionSeedCards, studyComplete]);

  // セッション完了時にクリア
  useEffect(() => {
    if (studyComplete && SESSION_KEY) localStorage.removeItem(SESSION_KEY);
  }, [studyComplete, SESSION_KEY]);

  const debugStreak = getDebugStreak();
  const effectiveStreak = debugStreak ?? sanitizeStreak(results?.streak);
  const stampRallyStreak =
    studyComplete && debugStreak === null
      ? Math.max(1, effectiveStreak)
      : effectiveStreak;

  const finalRatingByCardId = useMemo(() => {
    const finalByCardId = new Map<string, PracticeFilterRating>();
    for (const result of safeSessionResults) {
      if (result?.cardId) finalByCardId.set(result.cardId, result.rating);
    }
    return finalByCardId;
  }, [safeSessionResults]);

  const ratingCounts = useMemo(() => {
    const counts: Record<PracticeFilterRating, number> = {
      forgot: 0,
      vague: 0,
      remembered: 0,
      easy: 0,
    };
    for (const rating of finalRatingByCardId.values()) {
      counts[rating] += 1;
    }
    return counts;
  }, [finalRatingByCardId]);

  const logPracticeEvent = useCallback(
    (eventName, context = {}) => {
      if (!isAdvancedTelemetryEnabled) return;
      telemetry.log("info", eventName, {
        event: eventName,
        userId: currentUser?.uid,
        sourceSessionId,
        ...context,
      });
    },
    [currentUser?.uid, isAdvancedTelemetryEnabled, sourceSessionId, telemetry],
  );

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

  const handleToggleUncertainty = async (card: Card) => {
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
      handlePracticeExit("back_button");
      return;
    }
    if (folderId) {
      navigate(createPageUrl(`Folders?folderId=${folderId}`));
    } else {
      navigate(createPageUrl("Dashboard"));
    }
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] overflow-hidden bg-[#F5F7F8] p-4 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  const practiceCurrentCardId =
    isPracticeMode && practiceState?.phase === "cards"
      ? practiceState.roundQueue[0]
      : null;
  const practiceCurrentCard = practiceCurrentCardId
    ? studyCardById.get(practiceCurrentCardId)
    : null;
  const currentCard = isPracticeMode
    ? practiceCurrentCard
    : studyCards[currentIndex];

  const progressPercent = (() => {
    if (studyCards.length === 0) return 0;
    if (isPracticeMode && practiceState) {
      const done =
        (practiceState.roundTotal ?? 0) -
        (practiceState.roundQueue?.length ?? 0);
      return (done / (practiceState.roundTotal || 1)) * 100;
    }
    if (studyComplete) return 100;
    return (currentIndex / studyCards.length) * 100;
  })();

  const showCounter = isPracticeMode
    ? practiceState?.phase === "cards" && (practiceState?.roundTotal ?? 0) > 0
    : !studyComplete && studyCards.length > 0;

  const counterCurrent = isPracticeMode
    ? Math.min(
        practiceState?.roundTotal ?? 0,
        (practiceState?.roundTotal ?? 0) -
          (practiceState?.roundQueue?.length ?? 0) +
          1,
      )
    : currentIndex + 1;

  const counterTotal = isPracticeMode
    ? (practiceState?.roundTotal ?? 0)
    : studyCards.length;
  const isCompletionView =
    !isPracticeMode && studyComplete && studyCards.length > 0;

  const reviewPageStyle = {
    "--card-display-max-height": "100%",
  } as React.CSSProperties & Record<"--card-display-max-height", string>;

  return (
    <div
      data-page="review"
      className="reviewPage bg-[#F5F7F8] text-slate-800 h-[100dvh] overflow-hidden flex flex-col"
      style={reviewPageStyle}
    >
      <div className="reviewShell max-w-[1600px] mx-auto w-full p-3 md:py-4 md:px-8 h-full flex flex-col min-h-0">
        {!isCompletionView && (
          <div
            className={`reviewHeader shrink-0 flex items-center justify-between px-2 ${isCompletionView ? "mb-3 md:mb-4" : "mb-4 md:mb-6"}`}
          >
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
                  {isPracticeMode
                    ? `追い復習 ROUND ${practiceState.roundNumber}`
                    : "Knowledge Review"}
                </div>
                <h1 className="reviewTitle text-lg md:text-xl font-bold text-slate-700 font-serif truncate">
                  {(() => {
                    const t = currentCard?.title || "";
                    const q = currentCard
                      ? getCardText(currentCard, "question")
                      : "";
                    if (t && q && t.trim() === q.trim()) return t;
                    return t || "Untitled Card";
                  })()}
                </h1>
              </div>
            </div>

            {showCounter && (
              <div className="flex items-end gap-1 text-slate-400 shrink-0">
                <span className="text-2xl md:text-3xl font-bold text-slate-700 italic">
                  {counterCurrent}
                </span>
                <span className="text-sm md:text-lg font-medium mb-1">
                  / {counterTotal}
                </span>
              </div>
            )}
          </div>
        )}

        <div
          className={`reviewProgress shrink-0 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden ${isCompletionView ? "mb-4 md:mb-5" : "mb-6 md:mb-8"}`}
        >
          <div
            className="h-full bg-primary-600 transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(0, Math.min(100, progressPercent || 0))}%`,
            }}
          />
        </div>

        <div
          className={[
            "flex-1 min-h-0",
            // 画面全体が長くなる系（空/サマリー）はここでスクロールさせる
            studyCards.length === 0 ||
            studyComplete ||
            (isPracticeMode && practiceState?.phase === "summary")
              ? "overflow-y-auto overscroll-contain"
              : "overflow-hidden",
          ].join(" ")}
        >
          {studyCards.length === 0 ? (
            <StudyEmpty
              folderId={folderId}
              navigate={navigate}
              handleBack={handleBack}
            />
          ) : isPracticeMode ? (
            practiceState.phase === "summary" ? (
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
              cards={studyCards}
              sessionCurrentIndex={currentIndex}
              onResult={handleResult}
              onToggleUncertainty={handleToggleUncertainty}
              onToggleBookmark={handleToggleBookmark}
              onEdit={(card) =>
                navigate(
                  `/CardEdit?id=${card.id}&folderId=${folderId}&returnTo=study`,
                )
              }
              showHard={settings?.showReviewHard ?? true}
              showEasy={settings?.showReviewEasy ?? true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyMode;
