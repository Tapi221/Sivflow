import { Timestamp } from "firebase/firestore";

export interface BaseEntity {
  id: string;
  userId: string;
  deviceId: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  isDeleted: boolean;

  hasSyncConflict?: boolean;
  conflictDescription?: string;
}

export type SubjectiveScoreValue = 0 | 1 | 2 | 3;

export type ReviewLog = {
  reviewedAt: string;
  rating: 1 | 2 | 3 | 4;
  resistanceScore: number;
  durationMinutes?: number | null;
};

export type ReferenceBlockData = {
  url: string;
  name?: string;
};

export interface BlockConfig {
  id: string;
  type: "text" | "code" | "image" | "audio" | "reference" | "math" | "markdown";
  label: string;
  isVisible: boolean;
  orderIndex: number;
}

export type MathBlockData = {
  latex: string;
  displayMode: "block" | "inline";
  note?: string;
};

export type CardState =
  | "PRE-LEARN"
  | "STABLE"
  | "DECAYING"
  | "FAILED"
  | "RELEARN";




