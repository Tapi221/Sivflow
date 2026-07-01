import type { InkDocument } from "@core/domain/card/ink/inkDocument";
import { Timestamp } from "firebase/firestore";
import type { CodeBlockData } from "@/types/core/code-block";
import type { UploadedImage, UploadedPdf } from "./assets";
import type { BaseEntity, CardState, MathBlockData, ReferenceBlockData, ReviewLog, SubjectiveScoreValue } from "./base";



type CardBlock = {
  id: string;
  type:
  | "text"
  | "question"
  | "code"
  | "image"
  | "pdf"
  | "audio"
  | "reference"
  | "math"
  | "markdown";
  orderIndex: number;
  rowOffset?: number;
  offsetRows?: number;
  parentBlockId?: string | null;
  questionTitle?: string;
  questionAnswer?: string;
  content?: string;
  code?: CodeBlockData;
  images?: UploadedImage[];
  pdf?: UploadedPdf;
  pdfPageNumber?: number;
  audios?: Array<{ url: string; filename: string; order: number; }>;
  references?: ReferenceBlockData[];
  math?: MathBlockData;
  markdown?: string;
};
type CardFaceAttachmentAudio = {
  url: string;
  filename: string;
  order: number;
};
type CardFaceAttachments = {
  images?: UploadedImage[];
  audios?: CardFaceAttachmentAudio[];
  references?: ReferenceBlockData[];
};
type CardFace = {
  blocks: CardBlock[];
  ink?: InkDocument | null;
  extraRows?: number;
  attachments?: CardFaceAttachments;
};
type Card = BaseEntity & { cardSetId: string;
  folderId?: string;
  orderIndex: number;
  questionNumber: string;
  title?: string;
  tagIds?: string[];
  tags?: string[];
  front: CardFace;
  back: CardFace;
  layoutRows?: number;
  isDraft: boolean;
  hasUncertainty: boolean;
  isBookmarked?: boolean;
  isCompleted: boolean;
  isSilent: boolean;
  deletedAt?: Date | Timestamp | null;
  memoryStability: number;
  difficulty?: number;
  nextReviewDate: Date | Timestamp | null;
  lastReviewAt?: Date | Timestamp | null;
  state?: CardState;
  lastSubjectiveScore?: SubjectiveScoreValue;
  recoveryRemaining?: number;
  lastReviewDelayDays?: number;
  currentLevel?: number;
  responseTimeMs?: number;
  reviewCount?: number;
  reviewLogs?: ReviewLog[];
  cardId?: string;
  uncertaintyMarkedDate?: Date | Timestamp | null;
  completedDate?: Date | Timestamp | null;
  lastSyncedAt?: Date | Timestamp | null;
  syncState?: "pending" | "synced" | "error" | "conflict";
  lastSyncedByDeviceId?: string | null;
  _rescueRaw?: unknown;
};
type CardPatch = Omit<Partial<Card>, "front" | "back" | "cardSetId" | "folderId"> & { front?: Partial<CardFace>;
  back?: Partial<CardFace>;
};

export type { UploadedImage, CardBlock, CardFaceAttachmentAudio, CardFaceAttachments, CardFace, Card, CardPatch };
