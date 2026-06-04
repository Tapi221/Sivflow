import type { CSSProperties } from "react";
import { CARD_ROW_PX } from "@constants/shared/flashcard";
import type { CardBlock } from "@/types/domain/card";

export {getNormalizedGridOffsetRows,
  isGridOffsetType,} from "@/domain/card/blockOffset";

const ROW_OFFSET_MIN = -999;
const ROW_OFFSET_MAX = 999;

export const isRowPositionableType = (type: CardBlock["type"]) =>
  type === "text" ||
  type === "question" ||
  type === "code" ||
  type === "image" ||
  type === "pdf" ||
  type === "math" ||
  type === "markdown";

export const getNormalizedRowOffset = (block: CardBlock): number => {
  const n = Number(block.rowOffset ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(ROW_OFFSET_MIN, Math.min(ROW_OFFSET_MAX, Math.round(n)));
};

export const getRowOffsetPx = (block: CardBlock): number => {
  if (!isRowPositionableType(block.type)) return 0;
  return getNormalizedRowOffset(block) * CARD_ROW_PX;
};

export const getRowOffsetStyle = (
  block: CardBlock,
): CSSProperties | undefined => {
  const rowOffsetPx = getRowOffsetPx(block);
  if (rowOffsetPx === 0) return undefined;
  return { transform: `translateY(${rowOffsetPx}px)` };
};
