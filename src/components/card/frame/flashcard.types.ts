import type { InkDocument } from "@core/domain/card/ink/inkDocument";
import type { ReferenceBlockData } from "@/types/domain/base";
import type { CardBlock, CardFaceAttachments } from "@/types/domain/card";



type FlashcardMediaLike = string | { remoteUrl?: string | null; localUrl?: string | null; url?: string | null; localFileId?: string | null; assetId?: string | null; };
type FlashcardCodeLike = {
  code?: string; language?: string; } | null;
type FlashcardFaceLike = {
  blocks?: CardBlock[] | null;
  attachments?: CardFaceAttachments | null;
  ink?: InkDocument | null;
} | null;
type FlashcardCardLike = {
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
  questionCode?: FlashcardCodeLike;
  question_code?: FlashcardCodeLike;
  answerCode?: FlashcardCodeLike;
  answer_code?: FlashcardCodeLike;
  frontBlocks?: CardBlock[];
  backBlocks?: CardBlock[];
  front?: FlashcardFaceLike;
  back?: FlashcardFaceLike;
  layoutRows?: number;
  layout_rows?: number;
  questionExtraRows?: number;
  question_extra_rows?: number;
  answerExtraRows?: number;
  answer_extra_rows?: number;
  inkQuestion?: InkDocument | null;
  inkAnswer?: InkDocument | null;
  [key: string]: unknown;
};
type FlashcardSideDerivedSnapshot = {
  activeSide: "question" | "answer";
  activeImageItems: FlashcardMediaLike[];
  activeImages: string[];
  activeAudioUrls: string[];
  activeReferences: ReferenceBlockData[];
  activeBlocks: CardBlock[];
  activeInkDocument: InkDocument;
};
type FlashcardSharedDerivedSnapshot = {
  cardId: string | null;
  hasUncertainty: boolean;
  isBookmarked: boolean;
  layoutRows: number;
};
type FlashcardDualDerivedSnapshot = FlashcardSharedDerivedSnapshot & { question: FlashcardSideDerivedSnapshot;
  answer: FlashcardSideDerivedSnapshot;
};
interface FlashcardDerived extends FlashcardSharedDerivedSnapshot, FlashcardSideDerivedSnapshot {}

export type { FlashcardMediaLike, FlashcardCardLike, FlashcardSideDerivedSnapshot, FlashcardSharedDerivedSnapshot, FlashcardDualDerivedSnapshot, FlashcardDerived };
