import type { Card, SubjectiveScoreValue } from "@/types";



type StudyReviewProps = {
  cards: Card[];
  sessionCurrentIndex: number;
  onResult: (subjectiveScore: SubjectiveScoreValue, responseTime: number) => void | Promise<void>;
  onToggleUncertainty: (card: Card) => void;
  onToggleBookmark: (card: Card) => void;
  onEdit?: (card: Card) => void;
  showHard: boolean;
  showEasy: boolean;
};

export type { StudyReviewProps };
