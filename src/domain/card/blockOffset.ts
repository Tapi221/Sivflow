import type { CardBlock } from "@/types/domain/card";



const GRID_OFFSET_ROWS_MIN = 0;
const GRID_OFFSET_ROWS_MAX = 999;
const GRID_OFFSET_TYPES = new Set<CardBlock["type"]>(["math"]);



const isGridOffsetType = (type: CardBlock["type"]) => {
  return GRID_OFFSET_TYPES.has(type);
};
const getNormalizedGridOffsetRows = (block: CardBlock): number => {
  if (!isGridOffsetType(block.type)) return 0;
  const value = Number(block.offsetRows ?? block.rowOffset ?? 0);
  if (!Number.isFinite(value)) return 0;

  return Math.max(
    GRID_OFFSET_ROWS_MIN,
    Math.min(GRID_OFFSET_ROWS_MAX, Math.round(value)),
  );
};



export { isGridOffsetType, getNormalizedGridOffsetRows };
