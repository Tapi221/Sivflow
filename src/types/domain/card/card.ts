import type { BaseEntity } from "@/types/base";
import type { CardFace } from "./card-face";
import type { CardFlags } from "./card-flags";
import type { CardReviewState } from "./card-review";

export type Card = BaseEntity & {
  cardSetId: string;
  orderIndex: number;
  questionNumber: string;
  title?: string;
  tagIds?: string[];

  front: CardFace;
  back: CardFace;

  flags: CardFlags;
  review: CardReviewState;

  _rescueRaw?: unknown;
};
