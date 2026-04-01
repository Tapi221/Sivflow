import type { Timestamp } from "firebase/firestore";
import type { CardState, ReviewLog, SubjectiveScoreValue } from "@/types/base";

export type CardReviewState = {
  memoryStability: number;
  difficulty?: number;
  nextReviewDate: Date | Timestamp;
  lastReviewAt?: Date | Timestamp;
  state?: CardState;
  lastSubjectiveScore?: SubjectiveScoreValue;
  recoveryRemaining?: number;
  lastReviewDelayDays?: number;
  currentLevel?: number;
  responseTimeMs?: number;
  reviewCount?: number;
  reviewLogs?: ReviewLog[];
};
