import type { InkDocument } from "@/components/ink/inkTypes";
import type { CodeBlockData } from "@/types/core/code-block";
import { Timestamp } from "firebase/firestore";
import type { UploadedImage } from "./assets";
import type {
    BaseEntity,
    CardState,
    MathBlockData,
    ReferenceBlockData,
    ReviewLog,
    SubjectiveScoreValue,
} from "./base";

export type CardBlock = {
  id: string;
  type: "text" | "code" | "image" | "audio" | "reference" | "math" | "markdown";
  orderIndex: number;
  rowOffset?: number;
  offsetRows?: number;
  content?: string;
  code?: CodeBlockData;
  images?: UploadedImage[];
  audios?: Array<{ url: string; filename: string; order: number }>;
  references?: ReferenceBlockData[];
  math?: MathBlockData;
  markdown?: string;
};

export type Card = BaseEntity & {
  folderId: string;
  orderIndex: number;
  questionNumber: string;
  title?: string;
  tags?: string[];
  tagIds?: string[];
  isDraft: boolean;
  hasUncertainty: boolean;
  isBookmarked?: boolean;
  isCompleted: boolean;
  isSilent: boolean;
  questionText: string;
  questionMarked: string;
  questionImages: UploadedImage[];
  questionAudios: Array<{ url: string; filename: string; order: number }>;
  questionCode?: CodeBlockData | null;
  answerText: string;
  answerMarked: string;
  answerImages: UploadedImage[];
  answerAudios: Array<{ url: string; filename: string; order: number }>;
  answerCode?: CodeBlockData | null;
  questionBlocks?: CardBlock[];
  answerBlocks?: CardBlock[];
  layoutRows?: number;
  questionExtraRows?: number;
  answerExtraRows?: number;
  inkQuestion?: InkDocument | null;
  inkAnswer?: InkDocument | null;
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
  cardId?: string;
  uncertaintyMarkedDate?: Date | Timestamp;
  completedDate?: Date | Timestamp;
  _rescueRaw?: unknown;
};



