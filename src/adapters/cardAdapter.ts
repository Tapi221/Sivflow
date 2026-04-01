import type { Card } from "@/types/domain/card";
import type { Card as LegacyCard } from "@/types/domain/card"; // 仮

export const adaptCard = (c: any): Card => {
  return {
    ...c,
    front: {
      blocks: c.questionBlocks ?? [],
      ink: c.inkQuestion ?? null,
      extraRows: c.questionExtraRows,
    },
    back: {
      blocks: c.answerBlocks ?? [],
      ink: c.inkAnswer ?? null,
      extraRows: c.answerExtraRows,
    },
    flags: {
      isDraft: c.isDraft,
      hasUncertainty: c.hasUncertainty,
      isBookmarked: c.isBookmarked,
      isCompleted: c.isCompleted,
      isSilent: c.isSilent,
      uncertaintyMarkedDate: c.uncertaintyMarkedDate,
      completedDate: c.completedDate,
    },
    review: {
      memoryStability: c.memoryStability,
      difficulty: c.difficulty,
      nextReviewDate: c.nextReviewDate,
      lastReviewAt: c.lastReviewAt,
      state: c.state,
      lastSubjectiveScore: c.lastSubjectiveScore,
      recoveryRemaining: c.recoveryRemaining,
      lastReviewDelayDays: c.lastReviewDelayDays,
      currentLevel: c.currentLevel,
      responseTimeMs: c.responseTimeMs,
      reviewCount: c.reviewCount,
      reviewLogs: c.reviewLogs,
    },
  };
};
