import type { InkDocument } from "@/components/ink/inkTypes";
import type { CodeBlockData } from "@/types/domain/card
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
  type: "text" | "question" | "code" | "image" | "audio" | "reference" | "math" | "markdown";
  orderIndex: number;
  rowOffset?: number;
  offsetRows?: number;
  /** 疑問ブロック内の子ブロックが持つ。null または未定義ならトップレベル */
  parentBlockId?: string | null;
  /** type === "question" 専用: 疑問文（Q） */
  questionTitle?: string;
  /** type === "question" 専用: 回答（A） */
  questionAnswer?: string;
  content?: string;
  code?: CodeBlockData;
  images?: UploadedImage[];
  audios?: Array<{ url: string; filename: string; order: number }>;
  references?: ReferenceBlockData[];
  math?: MathBlockData;
  markdown?: string;
};

export type Card = BaseEntity & {
  /** CardSet への参照（必須）。移行前データは空文字で残る場合がある */
  cardSetId: string;
  /** @deprecated folderId は CardSet.folderId から辿る。後方互換のため残す */
  folderId?: string;
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
