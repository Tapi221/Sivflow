import { useCallback, useMemo, useState } from "react";
import { useTodayStudyStore } from "@/stores/useTodayStudyStore";



type PracticeFilterRating = "forgot" | "vague" | "remembered" | "easy";
type PracticeSessionState = {
  sourceSessionId: string;
  filterRating: PracticeFilterRating;
  roundNumber: number;
  roundQueue: string[];
  roundTotal: number;
  remaining: string[];
  doneCount: number;
  phase: "cards" | "summary";
};
type PracticeState = PracticeSessionState | null;
type Params = {
  finalRatingByCardId: Map<string, PracticeFilterRating>;
  sourceSessionId: string;
  isPracticeFeatureEnabled: boolean;
  logPracticeEvent: (
    eventName: string,
    context?: Record<string, unknown>,
  ) => void;
};



const shuffle = (items: string[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};
const usePracticeMode = ({ finalRatingByCardId, sourceSessionId, isPracticeFeatureEnabled, logPracticeEvent }: Params) => {
  const [practiceState, setPracticeState] = useState<PracticeState>(null);

  const isPracticeMode = useMemo(() => Boolean(practiceState), [practiceState]);

  const handleStartPractice = useCallback(
    (rating: PracticeFilterRating) => {
      if (!isPracticeFeatureEnabled) return;

      const cardIds = Array.from(finalRatingByCardId.entries())
        .filter(([, finalRating]) => finalRating === rating)
        .map(([cardId]) => cardId);

      if (cardIds.length === 0) return;

      const roundQueue = shuffle(cardIds);
      setPracticeState({
        sourceSessionId,
        filterRating: rating,
        roundNumber: 1,
        roundQueue,
        roundTotal: roundQueue.length,
        remaining: [],
        doneCount: 0,
        phase: "cards",
      });

      logPracticeEvent("practice_open", { rating, count: cardIds.length });
    },
    [
      finalRatingByCardId,
      isPracticeFeatureEnabled,
      logPracticeEvent,
      sourceSessionId,
    ],
  );

  const handlePracticeAnswer = useCallback(
    (answer: "ok" | "anxious") => {
      // setPracticeState の setter は同期的に呼ばれるため、
      // ここで消化したカード ID を捕捉して store 側へ反映する
      let doneCardId: string | null = null;

      setPracticeState((prev) => {
        if (!prev || prev.phase !== "cards") return prev;
        const [currentCardId, ...nextRoundQueue] = prev.roundQueue;
        if (!currentCardId) return prev;

        const nextRemaining =
          answer === "anxious"
            ? [...prev.remaining, currentCardId]
            : prev.remaining;
        const nextDoneCount =
          answer === "ok" ? prev.doneCount + 1 : prev.doneCount;
        const isRoundEnded = nextRoundQueue.length === 0;

        if (answer === "ok") doneCardId = currentCardId;

        logPracticeEvent("practice_answer", {
          rating: prev.filterRating,
          roundNumber: prev.roundNumber,
          answer,
        });

        return {
          ...prev,
          roundQueue: nextRoundQueue,
          remaining: nextRemaining,
          doneCount: nextDoneCount,
          phase: isRoundEnded ? "summary" : "cards",
        };
      });

      // 追い復習キューから消化済みカードを除外（ダッシュボード即時反映）
      if (doneCardId) {
        useTodayStudyStore.getState().markExtraDone(doneCardId);
      }
    },
    [logPracticeEvent],
  );

  const handlePracticeContinueRound = useCallback(() => {
    setPracticeState((prev) => {
      if (!prev || prev.remaining.length === 0) return prev;
      const roundQueue = shuffle(prev.remaining);
      return {
        ...prev,
        roundNumber: prev.roundNumber + 1,
        roundQueue,
        roundTotal: roundQueue.length,
        remaining: [],
        phase: "cards",
      };
    });
  }, []);

  const handlePracticeExit = useCallback(
    (reason = "manual") => {
      setPracticeState((prev) => {
        if (!prev) return prev;
        const remainingCount =
          prev.phase === "summary"
            ? prev.remaining.length
            : prev.remaining.length + prev.roundQueue.length;
        logPracticeEvent("practice_exit", {
          reason,
          rating: prev.filterRating,
          roundNumber: prev.roundNumber,
          remainingCount,
        });
        return null;
      });
    },
    [logPracticeEvent],
  );

  return {
    practiceState,
    isPracticeMode,
    handleStartPractice,
    handlePracticeAnswer,
    handlePracticeContinueRound,
    handlePracticeExit,
  };
};



export { usePracticeMode };


export type { PracticeFilterRating, PracticeSessionState, PracticeState };
