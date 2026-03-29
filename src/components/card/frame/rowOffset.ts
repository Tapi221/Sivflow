import { CARD_ROW_PX } from "@/components/card/common/constants";
import type { CardBlock } from "@/types";
import type { CSSProperties } from "react";

const ROW_OFFSET_MIN = -999;
const ROW_OFFSET_MAX = 999;
const GRID_OFFSET_ROWS_MIN = 0;
const GRID_OFFSET_ROWS_MAX = 999;
const GRID_OFFSET_TYPES = new Set<CardBlock["type"]>(["math"]);

export const isRowPositionableType = (type: CardBlock["type"]) =>
  type === "text" ||
  type === "question" ||
  type === "code" ||
  type === "image" ||
  type === "math" ||
  type === "markdown";

export const getNormalizedRowOffset = (block: CardBlock): number => {
  const n = Number(block.rowOffset ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(ROW_OFFSET_MIN, Math.min(ROW_OFFSET_MAX, Math.round(n)));
};

export const isGridOffsetType = (type: CardBlock["type"]) =>
  GRID_OFFSET_TYPES.has(type);

export const getNormalizedGridOffsetRows = (block: CardBlock): number => {
  if (!isGridOffsetType(block.type)) return 0;
  const n = Number(block.offsetRows ?? block.rowOffset ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(
    GRID_OFFSET_ROWS_MIN,
    Math.min(GRID_OFFSET_ROWS_MAX, Math.round(n)),
  );
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




