import { useCallback, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { buildCardSetById, resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import type { PracticeFilterRating } from "./usePracticeMode";
import { getLocalDb } from "@/services/localdb";
import { computeNextReview, createReviewLogEntry } from "@/services/reviewAlgorithm";
import { useTodayStudyStore } from "@/stores/useTodayStudyStore";
import type { Card, CardPatch, CardSet, SubjectiveScoreValue, UserSettings } from "@/types";
import { normalizeMemoryStability } from "@/utils/reviewUtils";



type StudySessionRating = PracticeFilterRating;
type StudySessionResult = {
  cardId: string;
  rating: StudySessionRating;
  subjectiveScore: SubjectiveScoreValue;
  responseTimeMs: number;
  studiedAt: Date;
};
type ResultsState = {
  0: number;
  1: number;
  2: number;
  3: number;
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
type Params = {
  studyCards: Card[];
  cardSets?: CardSet[];
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



const SCORE_TO_RATING: Record<SubjectiveScoreValue, StudySessionRating> = {
  0: "forgot",
  1: "vague",
  2: "remembered",
  3: "easy",
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
const useStudySession = ({ studyCards, cardSets = [], updateCard, currentUser, settings, createStudyLogMutation, createLevelHistoryMutation }: Params) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyComplete, setStudyComplete] = useState(false);
  const [results, setResults] = useState<ResultsState>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
  });
  const [sessionResults, setSessionResults] = useState<StudySessionResult[]>(
    [],
  );
  const [sourceSessionId] = useState(createSessionId);

  const safeSessionResults = sessionResults;
  const cardSetById = useMemo(() => {
    const activeCardSets = cardSets.filter((cardSet) => !cardSet.isDeleted);
    return buildCardSetById(activeCardSets);
  }, [cardSets]);

  const handleResult = useCallback(
    async (subjectiveScore: SubjectiveScoreValue, responseTime: number) => {
      const card = studyCards[currentIndex];
      if (!card) return;

      const reviewedAt = new Date();
      const memoryStabilityBefore = normalizeMemoryStability(
        card.memoryStability,
        card.currentLevel,
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
        const resolvedFolderId =
          resolveCardFolderIdStrict(card, cardSetById) ?? undefined;

        createStudyLogMutation.mutate({
          userId: currentUser.uid,
          cardId: card.id,
          folderId: resolvedFolderId,
          subjectiveScore,
          responseTime,
          createdAt: Timestamp.now(),
        });

        try {
          const localDb = await getLocalDb(currentUser.uid);
          await localDb.addItem("studyLogs", {
            userId: currentUser.uid,
            cardId: card.id,
            folderId: resolvedFolderId,
            subjectiveScore,
            responseTime,
            createdAt: reviewedAt,
            studiedAt: reviewedAt,
          });
        } catch {
          // noop
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

      setSessionResults((prev) => [
        ...prev,
        {
          cardId: card.id,
          rating: SCORE_TO_RATING[subjectiveScore],
          subjectiveScore,
          responseTimeMs: responseTime,
          studiedAt: reviewedAt,
        },
      ]);

      const todayStore = useTodayStudyStore.getState();
      const ratingKey = SCORE_TO_RATING[subjectiveScore];
      todayStore.addRating(ratingKey);
      if (subjectiveScore === 0 || subjectiveScore === 1) {
        todayStore.markForExtra(card.id);
      }

      setResults((prev) => ({
        ...prev,
        [subjectiveScore]: prev[subjectiveScore] + 1,
      }));

      if (currentIndex < studyCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        return;
      }

      setStudyComplete(true);
    },
    [
      cardSetById,
      createLevelHistoryMutation,
      createStudyLogMutation,
      currentIndex,
      currentUser,
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
  };
};



export { useStudySession };


export type { StudySessionRating, StudySessionResult };
