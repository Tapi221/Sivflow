import { sortBlocksByOrderIndex } from "@/components/card/blocks/core/blockOrdering";
import type { EditorDraft } from "./cardEditorUtils";
import { makeEmptyCardFaceAttachments, normalizeOrderIndex, sanitizeReferences } from "./cardEditorUtils";
import { waitForDraftImageUploads } from "./cardImageUploadSaveBarrier";
import { getCardBlocks } from "@/domain/card/content";
import { LEGACY_BASE_LAYOUT_ROWS, normalizeExtraRows, normalizeLayoutRows } from "@/domain/card/extraRows";
import { resolveCardTagNames } from "@/features/settings/hooks/useTags";
import type { UploadedImage } from "@/types/domain/assets";
import type { Card, CardBlock, CardFaceAttachments, CardPatch } from "@/types/domain/card";
import { sanitizeUploadedImages } from "@/utils/uploaded-image/sanitizer";



type BuildSavePayloadParams = {
  draft: EditorDraft;
  addTag: (name: string) => Promise<{ id: string; }>;
};
type CreatePanelCardParams = {
  selectedCard: Card | null;
  draft: EditorDraft | null;
  isEditing: boolean;
};
type CardToggleField = "isBookmarked" | "hasUncertainty";
type TagNameLookup = Parameters<typeof resolveCardTagNames>[1];
type PersistOperation = "created" | "updated" | "noop";
type PersistResult = | { ok: true; operation: PersistOperation; saved: boolean; }
  | { ok: false; message: string; };



const NEW_SENTINEL = "__new__" as const;
const AUTOSAVE_DELAY_MS = 700;



const createDraftPanelBaseCard = (): Card => {
  const now = new Date();

  return {
    id: NEW_SENTINEL,
    userId: "",
    deviceId: "",
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    cardSetId: "",
    orderIndex: 0,
    questionNumber: "",
    title: "",
    tagIds: [],
    tags: [],
    front: {
      blocks: [],
      attachments: makeEmptyCardFaceAttachments(),
    },
    back: {
      blocks: [],
      attachments: makeEmptyCardFaceAttachments(),
    },
    isDraft: false,
    hasUncertainty: false,
    isBookmarked: false,
    isCompleted: false,
    isSilent: false,
    memoryStability: 0,
    nextReviewDate: null,
    layoutRows: normalizeLayoutRows(undefined),
  };
};
const resolveTagIdsForSave = async (
  tags: string[],
  addTag: BuildSavePayloadParams["addTag"],
): Promise<string[]> => {
  const tagIds: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of tags) {
    const tagName = rawTag.trim();
    if (!tagName) continue;

    const tag = await addTag(tagName);
    const tagId = tag.id.trim();
    if (!tagId || seen.has(tagId)) continue;

    seen.add(tagId);
    tagIds.push(tagId);
  }

  return tagIds;
};
const cloneBlock = (block: CardBlock): CardBlock => {
  return { ...block, images: block.images?.map((image) => ({ ...image })), audios: block.audios?.map((audio) => ({ ...audio })), references: block.references?.map((reference) => ({ ...reference })), code: block.code ? { ...block.code } : undefined, math: block.math ? { ...block.math } : undefined, pdf: block.pdf ? { ...block.pdf } : block.pdf };
};
const cloneAttachments = (attachments: CardFaceAttachments | null | undefined): CardFaceAttachments => {
  return { images: attachments?.images?.map((image) => ({ ...image })) ?? [], audios: attachments?.audios?.map((audio) => ({ ...audio })) ?? [], references: attachments?.references?.map((reference) => ({ ...reference })) ?? [] };
};
const snapshotDraft = (draft: EditorDraft) => {
  return { title: draft.title, tags: [...draft.tags], isDraft: draft.isDraft, frontBlocks: draft.frontBlocks.map(cloneBlock), backBlocks: draft.backBlocks.map(cloneBlock), frontAttachments: cloneAttachments(draft.frontAttachments), backAttachments: cloneAttachments(draft.backAttachments), layoutRows: draft.layoutRows };
};
const draftSignature = (draft: EditorDraft | null) => {
  if (!draft) return null;
  return JSON.stringify({
    title: draft.title,
    tags: draft.tags,
    isDraft: draft.isDraft,
    frontBlocks: draft.frontBlocks,
    backBlocks: draft.backBlocks,
    frontAttachments: draft.frontAttachments,
    backAttachments: draft.backAttachments,
    layoutRows: normalizeLayoutRows(draft.layoutRows),
  });
};
const sanitizeBlocksForSave = (blocks: CardBlock[]) => {
  const next: CardBlock[] = [];
  for (const block of blocks ?? []) {
    if (block?.type === "image") {
      next.push({
        ...block,
        images: sanitizeUploadedImages(block.images ?? []) as UploadedImage[],
      });
      continue;
    }
    if (block?.type === "reference") {
      const cleaned = sanitizeReferences(block.references ?? []);
      if (cleaned.length === 0) continue;
      next.push({ ...block, references: cleaned });
      continue;
    }
    next.push(block);
  }
  return normalizeOrderIndex(next);
};
const sanitizeAttachmentsForSave = (attachments: CardFaceAttachments | null | undefined): CardFaceAttachments => {
  return { images: sanitizeUploadedImages(attachments?.images ?? []) as UploadedImage[], audios: (attachments?.audios ?? []).map((audio) => ({ ...audio })), references: sanitizeReferences(attachments?.references ?? []) };
};
const hasMeaningfulBlock = (block: CardBlock) => {
  if (block.type === "text") return String(block.content ?? "").trim().length > 0;
  if (block.type === "markdown")
    return String(block.markdown ?? "").trim().length > 0;
  if (block.type === "code")
    return String(block.code?.code ?? "").trim().length > 0;
  if (block.type === "math")
    return String(block.math?.latex ?? "").trim().length > 0;
  if (block.type === "image") return (block.images?.length ?? 0) > 0;
  if (block.type === "pdf") return Boolean(block.pdf);
  if (block.type === "reference") {
    return sanitizeReferences(block.references ?? []).length > 0;
  }
  if (block.type === "audio") return (block.audios?.length ?? 0) > 0;
  if (block.type === "question") {
    return (
      String(block.questionTitle ?? "").trim().length > 0 ||
      String(block.questionAnswer ?? "").trim().length > 0
    );
  }
  return false;
};
const hasMeaningfulAttachments = (attachments: CardFaceAttachments | null | undefined) => {
  return ((attachments?.images?.length ?? 0) > 0 || (attachments?.audios?.length ?? 0) > 0 || sanitizeReferences(attachments?.references ?? []).length > 0);
};
const hasMeaningfulDraft = (draft: EditorDraft) => {
  if (draft.title.trim().length > 0) return true;
  if (draft.tags.some((tag) => tag.trim().length > 0)) return true;
  if (draft.isDraft) return true;
  if (draft.frontBlocks.some(hasMeaningfulBlock)) return true;
  if (draft.backBlocks.some(hasMeaningfulBlock)) return true;
  if (hasMeaningfulAttachments(draft.frontAttachments)) return true;
  if (hasMeaningfulAttachments(draft.backAttachments)) return true;
  return false;
};
const extractCreatedCardId = (created: unknown) => {
  if (typeof created === "string" && created.trim().length > 0) return created;
  if (!created || typeof created !== "object") return null;

  if (
    "id" in created &&
    typeof (created as { id?: unknown; }).id === "string" &&
    (created as { id: string; }).id.trim().length > 0
  ) {
    return (created as { id: string; }).id;
  }

  if (
    "cardId" in created &&
    typeof (created as { cardId?: unknown; }).cardId === "string" &&
    (created as { cardId: string; }).cardId.trim().length > 0
  ) {
    return (created as { cardId: string; }).cardId;
  }

  return null;
};
const buildDraftFromCard = (card: Card, tagById: TagNameLookup): EditorDraft => {
  const legacyQuestionRows = normalizeExtraRows((card as unknown as { questionExtraRows?: unknown;
    question_extra_rows?: unknown;
  }
  ).questionExtraRows ??
    (
      card as unknown as {
        questionExtraRows?: unknown;
        question_extra_rows?: unknown;
      }
    ).question_extra_rows ??
    0,
  );

  const legacyAnswerRows = normalizeExtraRows(
    (
      card as unknown as {
        answerExtraRows?: unknown;
        answer_extra_rows?: unknown;
      }
    ).answerExtraRows ??
    (
      card as unknown as {
        answerExtraRows?: unknown;
        answer_extra_rows?: unknown;
      }
    ).answer_extra_rows ??
    0,
  );

  const migratedRows =
    LEGACY_BASE_LAYOUT_ROWS + Math.max(legacyQuestionRows, legacyAnswerRows);

  return {
    title: card.title ?? "",
    tags: resolveCardTagNames(card.tagIds, tagById),
    isDraft: card.isDraft ?? false,
    frontBlocks: sortBlocksByOrderIndex(getCardBlocks(card, "question")),
    backBlocks: sortBlocksByOrderIndex(getCardBlocks(card, "answer")),
    frontAttachments: cloneAttachments(
      card.front?.attachments ?? makeEmptyCardFaceAttachments(),
    ),
    backAttachments: cloneAttachments(card.back?.attachments ?? makeEmptyCardFaceAttachments()),
    layoutRows: normalizeLayoutRows(
      card.layoutRows ?? migratedRows,
    ),
  };
};
const buildPatchFromDraft = (draft: EditorDraft): CardPatch => {
  return { title: draft.title, tagIds: draft.tags, isDraft: draft.isDraft, front: { blocks: sanitizeBlocksForSave(draft.frontBlocks), attachments: sanitizeAttachmentsForSave(draft.frontAttachments) }, back: { blocks: sanitizeBlocksForSave(draft.backBlocks), attachments: sanitizeAttachmentsForSave(draft.backAttachments) }, layoutRows: normalizeLayoutRows(draft.layoutRows) };
};
const prepareDraftForPersist = async (draft: EditorDraft): Promise<EditorDraft> => {
  return waitForDraftImageUploads(draft);
};
const buildSavePayload = async ({ draft, addTag }: BuildSavePayloadParams): Promise<CardPatch> => {
  const persistedDraft = await prepareDraftForPersist(draft);
  const tagIds = await resolveTagIdsForSave(persistedDraft.tags, addTag);
  return buildPatchFromDraft({ ...persistedDraft, tags: tagIds });
};
const buildCardPatchForToggle = (card: Card, field: CardToggleField): CardPatch => {
  return { [field]: !card[field] } as CardPatch;
};
const createPanelCard = ({ selectedCard, draft, isEditing }: CreatePanelCardParams): Card | null => {
  if (!isEditing || !draft) return selectedCard;

  const baseCard = selectedCard ?? createDraftPanelBaseCard();

  return {
    ...baseCard,
    title: draft.title,
    tagIds: draft.tags,
    tags: draft.tags,
    isDraft: draft.isDraft,
    front: {
      ...baseCard.front,
      blocks: draft.frontBlocks,
      attachments: draft.frontAttachments,
    },
    back: {
      ...baseCard.back,
      blocks: draft.backBlocks,
      attachments: draft.backAttachments,
    },
    layoutRows: normalizeLayoutRows(draft.layoutRows),
  };
};



export { toDateOrNull } from "@/utils/toMillis";
export { NEW_SENTINEL, AUTOSAVE_DELAY_MS, cloneBlock, cloneAttachments, snapshotDraft, draftSignature, sanitizeBlocksForSave, sanitizeAttachmentsForSave, hasMeaningfulBlock, hasMeaningfulAttachments, hasMeaningfulDraft, extractCreatedCardId, buildDraftFromCard, buildPatchFromDraft, prepareDraftForPersist, buildSavePayload, buildCardPatchForToggle, createPanelCard };


export type { TagNameLookup, PersistOperation, PersistResult };
