import type { InkDocument } from "@core/domain/card/ink/inkDocument";
import { normalizeInkDocument } from "@core/domain/card/ink/inkDocument";
import { normalizeExtraRows } from "@/domain/card/extraRows";



type CardLike = Partial<Record<string, unknown>>;
type CardFaceSide = "question" | "answer";
type ResolveCardShapeOptions = {
  emptyInkAsNull?: boolean;
};



const getLegacyBlocksKey = (side: CardFaceSide) => {
  return side === "question" ? "questionBlocks" : "answerBlocks";
};
const getLegacyInkKey = (side: CardFaceSide) => {
  return side === "question" ? "inkQuestion" : "inkAnswer";
};
const getLegacyExtraRowsKeys = (side: CardFaceSide) => {
  return side === "question"
    ? (["questionExtraRows", "question_extra_rows"] as const)
    : (["answerExtraRows", "answer_extra_rows"] as const);
};
const resolveBlocksFromCardData = (value: CardLike, side: CardFaceSide) => {
  const aliasKey = side === "question" ? "frontBlocks" : "backBlocks";
  const legacyKey = getLegacyBlocksKey(side);
  const faceKey = side === "question" ? "front" : "back";
  const face = value[faceKey];

  if (
    face &&
    typeof face === "object" &&
    Array.isArray((face as { blocks?: unknown[]; }).blocks)
  ) {
    return (face as { blocks: unknown[]; }).blocks;
  }

  const aliased = value[aliasKey];
  if (Array.isArray(aliased)) return aliased;
  const legacy = value[legacyKey];
  if (Array.isArray(legacy)) return legacy;

  return [];
};
const resolveInkFromCardData = (value: CardLike, side: CardFaceSide, options?: ResolveCardShapeOptions): InkDocument | null => {
  const faceKey = side === "question" ? "front" : "back";
  const legacyKey = getLegacyInkKey(side);
  const face = value[faceKey];
  const faceInk =
    face && typeof face === "object"
      ? (face as { ink?: unknown; }).ink
      : undefined;
  const document = normalizeInkDocument(faceInk ?? value[legacyKey] ?? null);

  if (options?.emptyInkAsNull && document.strokes.length === 0) {
    return null;
  }

  return document;
};
const resolveExtraRowsFromCardData = (value: CardLike, side: CardFaceSide) => {
  const faceKey = side === "question" ? "front" : "back";
  const [legacyKey, snakeKey] = getLegacyExtraRowsKeys(side);
  const face = value[faceKey];
  const faceExtraRows =
    face && typeof face === "object"
      ? (face as { extraRows?: unknown; }).extraRows
      : undefined;

  return normalizeExtraRows(
    faceExtraRows ?? value[legacyKey] ?? value[snakeKey] ?? 0,
  );
};
const normalizeCardFolderId = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};



export { resolveBlocksFromCardData, resolveInkFromCardData, resolveExtraRowsFromCardData, normalizeCardFolderId };
