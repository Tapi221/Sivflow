import { normalizeInkDocument } from "@/components/ink/inkTypes";
import { normalizeExtraRows } from "@/domain/card/extraRows";

type CardLike = Partial<Record<string, unknown>>;
type CardFaceSide = "question" | "answer";

export const resolveBlocksFromCardData = (
  value: CardLike,
  side: CardFaceSide,
) => {
  const aliasKey = side === "question" ? "frontBlocks" : "backBlocks";
  const faceKey = side === "question" ? "front" : "back";
  const face = value[faceKey];

  if (
    face &&
    typeof face === "object" &&
    Array.isArray((face as { blocks?: unknown[] }).blocks)
  ) {
    return (face as { blocks: unknown[] }).blocks;
  }

  const aliased = value[aliasKey];
  if (Array.isArray(aliased)) return aliased;

  return [];
};

export const resolveInkFromCardData = (value: CardLike, side: CardFaceSide) => {
  const faceKey = side === "question" ? "front" : "back";
  const face = value[faceKey];
  const faceInk =
    face && typeof face === "object"
      ? (face as { ink?: unknown }).ink
      : undefined;

  return normalizeInkDocument(faceInk ?? null);
};

export const resolveExtraRowsFromCardData = (
  value: CardLike,
  side: CardFaceSide,
) => {
  const faceKey = side === "question" ? "front" : "back";
  const face = value[faceKey];
  const faceExtraRows =
    face && typeof face === "object"
      ? (face as { extraRows?: unknown }).extraRows
      : undefined;

  return normalizeExtraRows(faceExtraRows ?? 0);
};

export const normalizeCardFolderId = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};
