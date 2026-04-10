import { useCallback, useState } from "react";
import { Timestamp } from "firebase/firestore";
import {
  computeNextReview,
  createReviewLogEntry,
} from "@/services/reviewAlgorithm";
import { normalizeMemoryStability } from "@/utils/reviewUtils";
import { getDebugStreak } from "@/utils/debugStreak";
import { sanitizeStreak } from "@/utils/streak";
import { getLocalDb } from "@/services/localDB";
import { useTodayStudyStore } from "@/stores/useTodayStudyStore";
import type { Card, CardPatch, UserSettings } from "@/types";
import type { PracticeFilterRating } from "./usePracticeMode";

export type StudySessionRating = PracticeFilterRating;

export type StudySessionResult = {
  cardId: string;
  rating: StudySessionRating;
  subjectiveScore: number;
  responseTimeMs: number;
  studiedAt: Date;
};

type ResultsState = {
  0: number;
  1: number;
  2: number;
  3: number;
  streak: number;
};

type AuthUserLike =
  | {
      uid: string;
    }
  | null
  | undefined;

type MutationLike<T> = {
  mutate: (payload: T) => void;
};

const SCORE_TO_RATING: Record<number, StudySessionRating> = {
  0: "forgot",
  1: "vague",
  2: "remembered",
  3: "easy",
};

type Params = {
  studyCards: Card[];
  updateCard?: ((id: string, patch: CardPatch) => Promise<unknown>) | null;
  currentUser: AuthUserLike;
  settings: Pick<UserSettings, "delayBonusEnabled"> | null | undefined;
  createStudyLogMutation: MutationLike<{
    userId: string;
    cardId: string;
    folderId?: string;
    subjectiveScore: number;
    responseTime: number;
    createdAt: Timestamp;
  }>;
  createLevelHistoryMutation: MutationLike<Record<string, unknown>>;
};

const createSessionId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const useStudySession = ({
  studyCards,
  updateCard,
  currentUser,
  settings,
  createStudyLogMutation,
  createLevelHistoryMutation,
}: Params) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyComplete, setStudyComplete] = useState(false);
  const [results, setResults] = useState<ResultsState>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    streak: 0,
  });
  const [sessionResults, setSessionResults] = useState<StudySessionResult[]>(
    [],
  );
  const [sourceSessionId] = useState(createSessionId);

  const safeSessionResults = sessionResults;
  const debugStreak = getDebugStreak();
  const effectiveStreak = debugStreak ?? sanitizeStreak(results?.streak);
  const stampRallyStreak =
    studyComplete && debugStreak === null
      ? Math.max(1, effectiveStreak)
      : effectiveStreak;

  const fetchStreak = useCallback(async () => {
    if (!currentUser) return;
    try {
      setResults((prev) => ({ ...prev, streak: prev?.streak ?? 0 }));
    } catch {
      /* noop */
    }
  }, [currentUser]);

  const handleResult = useCallback(
    async (subjectiveScore: number, responseTime: number) => {
      const card = studyCards[currentIndex];
      if (!card) return;
      const reviewedAt = new Date();

      const memoryStabilityBefore = normalizeMemoryStability(
        card.memoryStability,
        card.currentLevel ?? card.level,
      );

      const reviewUpdate = computeNextReview({
        card,
        subjectiveScore,
        now: reviewedAt,
        delayBonusEnabled: settings?.delayBonusEnabled ?? false,
      });

      if (updateCard) {
        const newLog = createReviewLogEntry({
          reviewedAt,
          rating: (subjectiveScore + 1) as 1 | 2 | 3 | 4,
          intervalDays: reviewUpdate.intervalDays,
        });
        await updateCard(card.id, {
          ...reviewUpdate,
          reviewLogs: [...(card.reviewLogs ?? []), newLog],
          updatedAt: reviewedAt,
        } satisfies CardPatch);
      }

      if (currentUser) {
        createStudyLogMutation.mutate({
          userId: currentUser.uid,
          cardId: card.id,
          folderId: card.folderId,
          subjectiveScore,
          responseTime,
          createdAt: Timestamp.now(),
        });

        // Dashboardの即時反映用にローカルにも保存する
        try {
          const localDb = await getLocalDb(currentUser.uid);
          await localDb.addItem("studyLogs", {
            userId: currentUser.uid,
            cardId: card.id,
            folderId: card.folderId,
            subjectiveScore,
            responseTime,
            createdAt: reviewedAt,
            studiedAt: reviewedAt,
          });
        } catch {
          /* noop */
        }
      }

      if (
        Math.round(reviewUpdate.memoryStability) !==
          Math.round(memoryStabilityBefore) &&
        currentUser
      ) {
        createLevelHistoryMutation.mutate({
          userId: currentUser.uid,
          cardId: card.id,
          beforeLevel: memoryStabilityBefore,
          afterLevel: reviewUpdate.memoryStability,
          createdAt: new Date(),
        });
      }

      setSessionResults((prev) => {
        const base = prev;
        return [
          ...base,
          {
            cardId: card.id,
            rating: SCORE_TO_RATING[subjectiveScore] ?? "forgot",
            subjectiveScore,
            responseTimeMs: responseTime,
            studiedAt: reviewedAt,
          },
        ];
      });

      // 当日集計ストアを即時更新（ダッシュボードへの即時反映用）
      const ratingKey = SCORE_TO_RATING[subjectiveScore] ?? "forgot";
      const todayStore = useTodayStudyStore.getState();
      todayStore.addRating(ratingKey);
      if (subjectiveScore === 0 || subjectiveScore === 1) {
        todayStore.markForExtra(card.id);
      }

      setResults((prev) => ({
        ...prev,
        [subjectiveScore]: prev[subjectiveScore as 0 | 1 | 2 | 3] + 1,
      }));

      if (currentIndex < studyCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        return;
      }

      await fetchStreak();
      setStudyComplete(true);
    },
    [
      createLevelHistoryMutation,
      createStudyLogMutation,
      currentIndex,
      currentUser,
      fetchStreak,
      settings?.delayBonusEnabled,
      studyCards,
      updateCard,
    ],
  );

  return {
    currentIndex,
    setCurrentIndex,
    studyComplete,
    setStudyComplete,
    results,
    setResults,
    sessionResults,
    setSessionResults,
    safeSessionResults,
    sourceSessionId,
    handleResult,
    fetchStreak,
    effectiveStreak,
    stampRallyStreak,
  };
};
