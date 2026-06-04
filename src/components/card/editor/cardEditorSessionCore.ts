import { getCardBlocks } from "@/domain/card/content";
import { LEGACY_BASE_LAYOUT_ROWS, normalizeExtraRows, normalizeLayoutRows } from "@/domain/card/extraRows";
import { sortBlocksByOrderIndex } from "@/components/card/blocks/core/blockOrdering";
import { waitForDraftImageUploads } from "./cardImageUploadSaveBarrier";
import { type EditorDraft, makeEmptyCardFaceAttachments, normalizeOrderIndex, sanitizeReferences } from "./cardEditorUtils";
import { resolveCardTagNames } from "@/features/settings/hooks/useTags";
export { toDateOrNull } from "@/utils/toMillis";
import type { UploadedImage } from "@/types/domain/assets";
import type { Card, CardBlock, CardFaceAttachments, CardPatch } from "@/types/domain/card";
import { sanitizeUploadedImages } from "@/utils/uploaded-image/sanitizer";

export const NEW_SENTINEL = "__new__" as const;
export const AUTOSAVE_DELAY_MS = 700;

export type TagNameLookup = Parameters<typeof resolveCardTagNames>[1];

export type PersistOperation = "created" | "updated" | "noop";

export type PersistResult =
  | { ok: true; operation: PersistOperation; saved: boolean }
  | { ok: false; message: string };

export const cloneBlock = (block: CardBlock): CardBlock => {
  return {
    ...block,
    images: block.images?.map((image) => ({ ...image })),
    audios: block.audios?.map((audio) => ({ ...audio })),
    references: block.references?.map((reference) => ({ ...reference })),
    code: block.code ? { ...block.code } : undefined,
    math: block.math ? { ...block.math } : undefined,
    pdf: block.pdf ? { ...block.pdf } : block.pdf,
  };
};

export const cloneAttachments = (
  attachments: CardFaceAttachments | null | undefined,
): CardFaceAttachments => {
  return {
    images: attachments?.images?.map((image) => ({ ...image })) ?? [],
    audios: attachments?.audios?.map((audio) => ({ ...audio })) ?? [],
    references:
      attachments?.references?.map((reference) => ({ ...reference })) ?? [],
  };
};

export const snapshotDraft = (draft: EditorDraft) => {
  return {
    title: draft.title,
    tags: [...draft.tags],
    isDraft: draft.isDraft,
    frontBlocks: draft.frontBlocks.map(cloneBlock),
    backBlocks: draft.backBlocks.map(cloneBlock),
    frontAttachments: cloneAttachments(draft.frontAttachments),
    backAttachments: cloneAttachments(draft.backAttachments),
    layoutRows: draft.layoutRows,
  };
};

export const draftSignature = (draft: EditorDraft | null) => {
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

export const sanitizeBlocksForSave = (blocks: CardBlock[]) => {
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

export const sanitizeAttachmentsForSave = (
  attachments: CardFaceAttachments | null | undefined,
): CardFaceAttachments => {
  return {
    images: sanitizeUploadedImages(
      attachments?.images ?? [],
    ) as UploadedImage[],
    audios: (attachments?.audios ?? []).map((audio) => ({ ...audio })),
    references: sanitizeReferences(attachments?.references ?? []),
  };
};

export const hasMeaningfulBlock = (block: CardBlock) => {
  if (block.type === "text")
    return String(block.content ?? "").trim().length > 0;
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

export const hasMeaningfulAttachments = (
  attachments: CardFaceAttachments | null | undefined,
) => {
  return (
    (attachments?.images?.length ?? 0) > 0 ||
    (attachments?.audios?.length ?? 0) > 0 ||
    sanitizeReferences(attachments?.references ?? []).length > 0
  );
};

export const hasMeaningfulDraft = (draft: EditorDraft) => {
  if (draft.title.trim().length > 0) return true;
  if (draft.tags.some((tag) => tag.trim().length > 0)) return true;
  if (draft.isDraft) return true;
  if (draft.frontBlocks.some(hasMeaningfulBlock)) return true;
  if (draft.backBlocks.some(hasMeaningfulBlock)) return true;
  if (hasMeaningfulAttachments(draft.frontAttachments)) return true;
  if (hasMeaningfulAttachments(draft.backAttachments)) return true;
  return false;
};

export const extractCreatedCardId = (
  created: unknown,
) => {
  if (typeof created === "string" && created.trim().length > 0) return created;
  if (!created || typeof created !== "object") return null;

  if (
    "id" in created &&
    typeof (created as { id?: unknown }).id === "string" &&
    (created as { id: string }).id.trim().length > 0
  ) {
    return (created as { id: string }).id;
  }

  if (
    "cardId" in created &&
    typeof (created as { cardId?: unknown }).cardId === "string" &&
    (created as { cardId: string }).cardId.trim().length > 0
  ) {
    return (created as { cardId: string }).cardId;
  }

  return null;
};

export const buildDraftFromCard = (
  card: Card,
  tagById: TagNameLookup,
): EditorDraft => {
  const legacyQuestionRows = normalizeExtraRows(
    (
      card as unknown as {
        questionExtraRows?: unknown;
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

export const buildPatchFromDraft = (
  draft: EditorDraft,
): CardPatch => {
  return {
    title: draft.title,
    tagIds: draft.tags,
    isDraft: draft.isDraft,
    front: {
      blocks: sanitizeBlocksForSave(draft.frontBlocks),
      attachments: sanitizeAttachmentsForSave(draft.frontAttachments),
    },
    back: {
      blocks: sanitizeBlocksForSave(draft.backBlocks),
      attachments: sanitizeAttachmentsForSave(draft.backAttachments),
    },
    layoutRows: normalizeLayoutRows(draft.layoutRows),
  };
};

export const prepareDraftForPersist = async (
  draft: EditorDraft,
): Promise<EditorDraft> => {
  return waitForDraftImageUploads(draft);
};
