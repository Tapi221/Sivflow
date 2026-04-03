import { DEFAULT_LAYOUT_ROWS } from "@/domain/card/extraRows";

import type { CardBlock, ReferenceBlockData } from "@/types/domain/card";
const NEW_SENTINEL = "__new__" as const;

export type EditorDraft = {
  title: string;
  tags: string[];
  isDraft: boolean;
  frontBlocks: CardBlock[];
  backBlocks: CardBlock[];
  layoutRows: number;
};

export function normalizeSelectedCardId(raw: string | null): string | null {
  if (!raw) return null;
  if (raw === NEW_SENTINEL) return NEW_SENTINEL;
  if (raw === "new" || raw === "NEW" || raw === "create") return NEW_SENTINEL;
  return raw;
}

export function makeNewDraft(): EditorDraft {
  return {
    title: "",
    tags: [],
    isDraft: false,
    frontBlocks: [],
    backBlocks: [],
    layoutRows: DEFAULT_LAYOUT_ROWS,
  };
}

export function sanitizeReferences(
  refs: ReferenceBlockData[],
): ReferenceBlockData[] {
  return (refs ?? [])
    .map((r) => ({
      url: (r?.url ?? "").trim(),
      name: (r?.name ?? "").trim(),
    }))
    .filter((r) => r.url.length > 0 || r.name.length > 0);
}

export function normalizeOrderIndex(blocks: CardBlock[]): CardBlock[] {
  return (blocks ?? []).map((b, i) => ({ ...b, orderIndex: i }));
}

function isBlockEmpty(block: CardBlock): boolean {
  if (block.type === "reference" || block.type === "audio") return true;
  if (block.type === "text") return !String(block.content ?? "").trim();
  if (block.type === "markdown") return !String(block.markdown ?? "").trim();
  if (block.type === "code") return !String(block.code?.code ?? "").trim();
  if (block.type === "math") return !String(block.math?.latex ?? "").trim();
  if (block.type === "image") return (block.images?.length ?? 0) === 0;
  return true;
}

export function shouldAutoOpenEditorForCard(card: unknown): boolean {
  if (!card) return false;
  const safeCard = card as {
    title?: string;
    tagIds?: unknown[];
    tags?: unknown[];
    frontBlocks?: CardBlock[];
    backBlocks?: CardBlock[];
    front?: { blocks?: CardBlock[] | null } | null;
    back?: { blocks?: CardBlock[] | null } | null;
  };
  if (String(safeCard.title ?? "").trim().length > 0) return false;
  if ((safeCard.tagIds ?? safeCard.tags ?? []).length > 0) return false;
  const frontBlocks = Array.isArray(safeCard.front?.blocks)
    ? safeCard.front.blocks
    : Array.isArray(safeCard.frontBlocks)
      ? safeCard.frontBlocks
      : [];
  const backBlocks = Array.isArray(safeCard.back?.blocks)
    ? safeCard.back.blocks
    : Array.isArray(safeCard.backBlocks)
      ? safeCard.backBlocks
      : [];
  const hasQuestionContent = frontBlocks.some((b) => !isBlockEmpty(b));
  const hasAnswerContent = backBlocks.some((b) => !isBlockEmpty(b));
  return !hasQuestionContent && !hasAnswerContent;
}
