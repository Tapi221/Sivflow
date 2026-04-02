import type { Card } from "@/types/domain/card";

type LegacyCardInput = Partial<Card> & Record<string, unknown>;

export const adaptCard = (c: LegacyCardInput): Card => {
  const legacy = c as Record<string, unknown>;

  return {
    ...(c as Card),

    front: {
      blocks:
        (legacy.questionBlocks as Card["front"]["blocks"] | undefined) ?? [],
      ink:
        (legacy.inkQuestion as Card["front"]["ink"] | null | undefined) ?? null,
      extraRows: legacy.questionExtraRows as Card["front"]["extraRows"],
    },

    back: {
      blocks:
        (legacy.answerBlocks as Card["back"]["blocks"] | undefined) ?? [],
      ink:
        (legacy.inkAnswer as Card["back"]["ink"] | null | undefined) ?? null,
      extraRows: legacy.answerExtraRows as Card["back"]["extraRows"],
    },

    flags: {
      isDraft: legacy.isDraft as boolean | undefined,
      hasUncertainty: legacy.hasUncertainty as boolean | undefined,
      isBookmarked: legacy.isBookmarked as boolean | undefined,
      isCompleted: legacy.isCompleted as boolean | undefined,
      isSilent: legacy.isSilent as boolean | undefined,
      uncertaintyMarkedDate: legacy.uncertaintyMarkedDate as unknown,
      completedDate: legacy.completedDate as unknown,
    },

    review: {
      memoryStability: legacy.memoryStability as number | undefined,
      difficulty: legacy.difficulty as number | undefined,
      nextReviewDate: legacy.nextReviewDate as unknown,
      lastReviewAt: legacy.lastReviewAt as unknown,
      state: legacy.state as unknown,
      lastSubjectiveScore: legacy.lastSubjectiveScore as number | undefined,
      recoveryRemaining: legacy.recoveryRemaining as number | undefined,
      lastReviewDelayDays: legacy.lastReviewDelayDays as number | undefined,
      currentLevel: legacy.currentLevel as number | undefined,
      responseTimeMs: legacy.responseTimeMs as number | undefined,
      reviewCount: legacy.reviewCount as number | undefined,
      reviewLogs: legacy.reviewLogs as unknown,
    },
  } as Card;
};