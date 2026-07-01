import { DEFAULT_LAYOUT_ROWS } from "@/domain/card/extraRows";
import type { ReferenceBlockData } from "@/types/domain/base";
import type { CardBlock, CardFaceAttachments } from "@/types/domain/card";



type EditorDraft = {
  title: string;
  tags: string[];
  isDraft: boolean;
  frontBlocks: CardBlock[];
  backBlocks: CardBlock[];
  frontAttachments: CardFaceAttachments;
  backAttachments: CardFaceAttachments;
  layoutRows: number;
};



const NEW_SENTINEL = "__new__" as const;



const makeEmptyCardFaceAttachments = (): CardFaceAttachments => ({ images: [], audios: [], references: [] });
const normalizeSelectedCardId = (raw: string | null) => {
  if (!raw) return null;
  if (raw === NEW_SENTINEL) return NEW_SENTINEL;
  if (raw === "new" || raw === "NEW" || raw === "create") return NEW_SENTINEL;
  return raw;
};
const makeNewDraft = () => {
  return { title: "", tags: [], isDraft: false, frontBlocks: [], backBlocks: [], frontAttachments: makeEmptyCardFaceAttachments(), backAttachments: makeEmptyCardFaceAttachments(), layoutRows: DEFAULT_LAYOUT_ROWS };
};
const sanitizeReferences = (refs: ReferenceBlockData[]) => {
  return (refs ?? []).map((r) => ({ url: (r?.url ?? "").trim(), name: (r?.name ?? "").trim() })).filter((r) => r.url.length > 0 || r.name.length > 0);
};
const normalizeOrderIndex = (blocks: CardBlock[]) => {
  return (blocks ?? []).map((b, i) => ({ ...b, orderIndex: i }));
};
const isBlockEmpty = (block: CardBlock) => {
  if (block.type === "reference" || block.type === "audio") return true;
  if (block.type === "text") return !String(block.content ?? "").trim();
  if (block.type === "markdown") return !String(block.markdown ?? "").trim();
  if (block.type === "code") return !String(block.code?.code ?? "").trim();
  if (block.type === "math") return !String(block.math?.latex ?? "").trim();
  if (block.type === "image") return (block.images?.length ?? 0) === 0;
  return true;
};
const hasAttachmentContent = (
  attachments: CardFaceAttachments | null | undefined,
) => {
  return (
    (attachments?.images?.length ?? 0) > 0 ||
    (attachments?.audios?.length ?? 0) > 0 ||
    sanitizeReferences(attachments?.references ?? []).length > 0
  );
};
const shouldAutoOpenEditorForCard = (card: unknown) => {
  if (!card) return false;
  const safeCard = card as {
    title?: string;
    tagIds?: unknown[];
    tags?: unknown[];
    frontBlocks?: CardBlock[];
    backBlocks?: CardBlock[];
    front?: {
      blocks?: CardBlock[] | null;
      attachments?: CardFaceAttachments | null;
    } | null;
    back?: {
      blocks?: CardBlock[] | null;
      attachments?: CardFaceAttachments | null;
    } | null;
  };
  if (String(safeCard.title ?? "").trim().length > 0) return false;
  if ((safeCard.tagIds ?? []).length > 0) return false;
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
  const hasQuestionAttachments = hasAttachmentContent(
    safeCard.front?.attachments ?? null,
  );
  const hasAnswerAttachments = hasAttachmentContent(
    safeCard.back?.attachments ?? null,
  );
  return (
    !hasQuestionContent &&
    !hasAnswerContent &&
    !hasQuestionAttachments &&
    !hasAnswerAttachments
  );
};



export { makeEmptyCardFaceAttachments, normalizeSelectedCardId, makeNewDraft, sanitizeReferences, normalizeOrderIndex, shouldAutoOpenEditorForCard };


export type { EditorDraft };
