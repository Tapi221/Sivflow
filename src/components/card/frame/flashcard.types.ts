import type { InkDocument } from "@/components/ink/inkTypes";
import type { ReferenceBlockData } from "@/types/domain/base";
import type { CardBlock, CardFaceAttachments } from "@/types/domain/card";

export type FlashcardMediaLike =
  | string
  | {
    remoteUrl?: string | null;
    localUrl?: string | null;
    url?: string | null;
    localFileId?: string | null;
    assetId?: string | null;
  };

export type FlashcardCardLike = {
  id?: string;
  cardId?: string;
  has_uncertainty?: boolean;
  hasUncertainty?: boolean;
  is_bookmarked?: boolean;
  isBookmarked?: boolean;
  question_text?: string;
  questionText?: string;
  answer_text?: string;
  answerText?: string;
  question_images?: FlashcardMediaLike[];
  questionImages?: FlashcardMediaLike[];
  answer_images?: FlashcardMediaLike[];
  answerImages?: FlashcardMediaLike[];
  question_audios?: FlashcardMediaLike[];
  questionAudios?: FlashcardMediaLike[];
  answer_audios?: FlashcardMediaLike[];
  answerAudios?: FlashcardMediaLike[];
  questionCode?: { code?: string; language?: string } | null;
  question_code?: { code?: string; language?: string } | null;
  answerCode?: { code?: string; language?: string } | null;
  answer_code?: { code?: string; language?: string } | null;
  frontBlocks?: CardBlock[];
  backBlocks?: CardBlock[];
  front?: {
    blocks?: CardBlock[] | null;
    attachments?: CardFaceAttachments | null;
    ink?: InkDocument | null;
  } | null;
  back?: {
    blocks?: CardBlock[] | null;
    attachments?: CardFaceAttachments | null;
    ink?: InkDocument | null;
  } | null;
  layoutRows?: number;
  layout_rows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  questionExtraRows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  question_extra_rows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  answerExtraRows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  answer_extra_rows?: number;
  inkQuestion?: InkDocument | null;
  inkAnswer?: InkDocument | null;
  [key: string]: unknown;
};

export type FlashcardSideDerivedSnapshot = {
  activeSide: "question" | "answer";
  activeImageItems: FlashcardMediaLike[];
  activeImages: string[];
  activeAudioUrls: string[];
  activeReferences: ReferenceBlockData[];
  activeBlocks: CardBlock[];
  activeInkDocument: InkDocument;
};

export type FlashcardSharedDerivedSnapshot = {
  cardId: string | null;
  hasUncertainty: boolean;
  isBookmarked: boolean;
  layoutRows: number;
};

export type FlashcardDualDerivedSnapshot = FlashcardSharedDerivedSnapshot & {
  question: FlashcardSideDerivedSnapshot;
  answer: FlashcardSideDerivedSnapshot;
};

export interface FlashcardDerived extends FlashcardSharedDerivedSnapshot, FlashcardSideDerivedSnapshot {}
