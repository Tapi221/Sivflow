import { Timestamp } from "firebase/firestore";



interface BaseEntity {
  [key: string]: unknown;
  id: string;
  userId: string;
  deviceId: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  isDeleted: boolean;

  hasSyncConflict?: boolean;
  conflictDescription?: string;
}
type SubjectiveScoreValue = 0 | 1 | 2 | 3;
type ReviewLog = {
  reviewedAt: string;
  rating: 1 | 2 | 3 | 4;
  resistanceScore: number;
  durationMinutes?: number | null;
};
type ReferenceBlockData = {
  url: string;
  name?: string;
};
interface BlockConfig {
  id: string;
  type:
  | "text"
  | "code"
  | "image"
  | "audio"
  | "reference"
  | "math"
  | "markdown"
  | "question";
  label: string;
  isVisible: boolean;
  orderIndex: number;
}
type MathBlockData = {
  latex: string;
  displayMode: "block" | "inline";
  note?: string;
};
type CardState = | "PRE-LEARN" | "STABLE" | "DECAYING" | "FAILED" | "RELEARN";

export type { BaseEntity, SubjectiveScoreValue, ReviewLog, ReferenceBlockData, BlockConfig, MathBlockData, CardState };
