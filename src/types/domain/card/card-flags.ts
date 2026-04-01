import type { Timestamp } from "firebase/firestore";

export type CardFlags = {
  isDraft: boolean;
  hasUncertainty: boolean;
  isBookmarked?: boolean;
  isCompleted: boolean;
  isSilent: boolean;
  uncertaintyMarkedDate?: Date | Timestamp;
  completedDate?: Date | Timestamp;
};
