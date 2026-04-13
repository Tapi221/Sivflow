import type { Card } from "@/types";

export type StudyReviewProps = {
  cards: Card[];
  sessionCurrentIndex: number;
  onResult: (subjectiveScore: number, responseTime: number) => void;
  onToggleUncertainty: (card: Card) => void;
  onToggleBookmark: (card: Card) => void;
  onEdit?: (card: Card) => void;
  showHard: boolean;
  showEasy: boolean;
};
