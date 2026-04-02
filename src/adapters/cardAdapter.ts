import type { Card } from "@/types/domain/card";

export const adaptCard = (c: any): Card => {
  const {
    // front/back
    questionBlocks,
    inkQuestion,
    questionExtraRows,
    answerBlocks,
    inkAnswer,
    answerExtraRows,

    // flags
    isDraft,
    hasUncertainty,
    isBookmarked,
    isCompleted,
    isSilent,
    uncertaintyMarkedDate,
    completedDate,

    // review
    memoryStability,
    difficulty,
    nextReviewDate,
    lastReviewAt,
    state,
    lastSubjectiveScore,
    recoveryRemaining,
    lastReviewDelayDays,
    currentLevel,
    responseTimeMs,
    reviewCount,
    reviewLogs,
  } = c;

  return {
    ...c,

    front: {
      blocks: questionBlocks ?? [],
      ink: inkQuestion ?? null,
      extraRows: questionExtraRows,
    },

    back: {
      blocks: answerBlocks ?? [],
      ink: inkAnswer ?? null,
      extraRows: answerExtraRows,
    },

    flags: {
      isDraft,
      hasUncertainty,
      isBookmarked,
      isCompleted,
      isSilent,
      uncertaintyMarkedDate,
      completedDate,
    },

    review: {
      memoryStability,
      difficulty,
      nextReviewDate,
      lastReviewAt,
      state,
      lastSubjectiveScore,
      recoveryRemaining,
      lastReviewDelayDays,
      currentLevel,
      responseTimeMs,
      reviewCount,
      reviewLogs,
    },
  };
};