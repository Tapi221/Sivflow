import { Timestamp } from "firebase/firestore";

import type { InkDocument } from "@/components/ink/inkTypes";

import type { UploadedImage } from "./assets";
import type {
  BaseEntity,
  CardState,
  MathBlockData,
  ReferenceBlockData,
  ReviewLog,
  SubjectiveScoreValue,
} from "./base";

import type { CodeBlockData } from "@/types/core/code-block";

export type CardBlock = {
  id: string;
  type:
    | "text"
    | "question"
    | "code"
    | "image"
    | "audio"
    | "reference"
    | "math"
    | "markdown";
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

export type CardFaceAttachmentAudio = {
  url: string;
  filename: string;
  order: number;
};

export type CardFaceAttachments = {
  images?: UploadedImage[];
  audios?: CardFaceAttachmentAudio[];
  references?: ReferenceBlockData[];
};

export type CardFace = {
  blocks: CardBlock[];
  ink?: InkDocument | null;
  extraRows?: number;
  attachments?: CardFaceAttachments;
};

export type Card = BaseEntity & {
  /** CardSet への参照（必須）。移行前データは空文字で残る場合がある */
  cardSetId: string;
  /** @deprecated folderId は CardSet.folderId から辿る。後方互換のため残す */
  folderId?: string;
  orderIndex: number;
  questionNumber: string;
  title?: string;
  tagIds?: string[];
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
  /**
   * このデバイスで、そのカードの同期が最後に完了した時刻。
   * ローカル専用メタデータであり、クラウドへは送らない。
   */
  lastSyncedAt?: Date | Timestamp | null;
  /**
   * このデバイスにおけるカードの同期状態。
   * pending: ローカル変更あり / 未反映
   * synced: 同期済み
   * error: 同期失敗
   * conflict: 競合あり
   */
  syncState?: "pending" | "synced" | "error" | "conflict";
  /**
   * lastSyncedAt を記録したデバイスID。
   * ローカル専用メタデータであり、クラウドへは送らない。
   */
  lastSyncedByDeviceId?: string | null;
  _rescueRaw?: unknown;
};

export type CardPatch = Omit<
  Partial<Card>,
  "front" | "back" | "cardSetId" | "folderId"
> & {
  front?: Partial<CardFace>;
  back?: Partial<CardFace>;
};
