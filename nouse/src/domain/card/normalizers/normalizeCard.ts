import { normalizeInkDocument } from "@core/domain/card/ink/inkDocument";
import { normalizeUploadedImages } from "@/domain/assets/uploadedImageNormalizer";
import { isGridOffsetType } from "@/domain/card/blockOffset";
import { LEGACY_BASE_LAYOUT_ROWS, normalizeExtraRows, normalizeLayoutRows } from "@/domain/card/extraRows";
import { normalizeReviewLogs } from "./reviewLogs";
import { normalizeMemoryStability } from "@/domain/card/review/stability";
import type { UploadedPdf } from "@/types/domain/assets";
import type { SubjectiveScoreValue } from "@/types/domain/base";
import type { Card, CardBlock } from "@/types/domain/card";
import { normalizeDate } from "@/utils/codec/date";
import { toArrayOr, toBoolOr, toFiniteNumber, toStringOr } from "@/utils/codec/primitives";
import { makeFallbackId } from "@/utils/fallbackId";
import type { UnknownRecord } from "@/utils/records";
import { asRecord, pick } from "@/utils/records";



type GridBlockType = Parameters<typeof isGridOffsetType>[0];



const CARD_BLOCK_TYPES = new Set<CardBlock["type"]>([
  "text",
  "question",
  "code",
  "image",
  "audio",
  "reference",
  "math",
  "markdown",
  "pdf",
]);
const SUBJECTIVE_SCORE_VALUES = new Set<SubjectiveScoreValue>([0, 1, 2, 3]);



const isGridBlockType = (value: unknown): value is GridBlockType => {
  return (
    value === "text" ||
    value === "markdown" ||
    value === "code" ||
    value === "image" ||
    value === "audio" ||
    value === "reference" ||
    value === "math" ||
    value === "pdf"
  );
};
const isCardBlockType = (value: unknown): value is CardBlock["type"] => {
  return (
    typeof value === "string" &&
    CARD_BLOCK_TYPES.has(value as CardBlock["type"])
  );
};
const normalizeOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(normalized) ? normalized : undefined;
};
const normalizeSubjectiveScore = (value: unknown): SubjectiveScoreValue | undefined => {
  if (SUBJECTIVE_SCORE_VALUES.has(value as SubjectiveScoreValue)) {
    return value as SubjectiveScoreValue;
  }
  return undefined;
};
const resolveFallbackTextContent = (block: UnknownRecord): string => {
  if (typeof block.content === "string" && block.content.trim()) {
    return block.content;
  }
  if (typeof block.markdown === "string" && block.markdown.trim()) {
    return block.markdown;
  }
  const code = asRecord(block.code);
  if (typeof code?.code === "string" && code.code.trim()) {
    return code.code;
  }
  const questionTitle = toStringOr(block.questionTitle, "").trim();
  const questionAnswer = toStringOr(block.questionAnswer, "").trim();
  if (questionTitle || questionAnswer) {
    return [questionTitle, questionAnswer].filter(Boolean).join("\n\n");
  }
  return "";
};
const normalizeUploadedPdf = (value: unknown): UploadedPdf | null => {
  const pdf = asRecord(value);
  if (!pdf) return null;
  const id = toStringOr(pick(pdf.id, pdf.assetId, pdf.localFileId), "").trim();
  const assetId = toStringOr(pdf.assetId, "").trim();
  const localFileId = toStringOr(pdf.localFileId, "").trim();
  const remoteUrl = toStringOr(pdf.remoteUrl, "").trim();
  const localUrl = toStringOr(pdf.localUrl, "").trim();
  const storagePath = toStringOr(pdf.storagePath, "").trim();
  const hasSource = Boolean(id || assetId || localFileId || remoteUrl || localUrl || storagePath);
  if (!hasSource) return null;
  const status =
    pdf.status === "pending" ||
      pdf.status === "uploading" ||
      pdf.status === "ready" ||
      pdf.status === "failed"
      ? pdf.status
      : "ready";
  const filename = toStringOr(pick(pdf.filename, pdf.name), "").trim() ?? "PDF";
  return {
    id: id || assetId || localFileId || makeFallbackId(),
    assetId: assetId || null,
    filename,
    localUrl: (localUrl || null) as UploadedPdf["localUrl"],
    remoteUrl: (remoteUrl || null) as UploadedPdf["remoteUrl"],
    storagePath: storagePath || null,
    localFileId: localFileId || null,
    status,
    contentType: toStringOr(pdf.contentType, "application/pdf") ?? "application/pdf",
    size: normalizeOptionalNumber(pdf.size),
    sizeBytes: normalizeOptionalNumber(pdf.sizeBytes),
    retryCount: normalizeOptionalNumber(pdf.retryCount),
    error: toStringOr(pdf.error, "") || undefined,
    source: pdf.source === "cloud" || pdf.source === "local_fallback" ? pdf.source : undefined,
    updatedAt: normalizeDate(pdf.updatedAt),
  };
};
const normalizeBlockOffsets = (blockRaw: unknown) => {
  const block = asRecord(blockRaw);
  if (!block) return blockRaw;
  const shouldNormalizeOffsetRows =
    isGridBlockType(block.type) &&
    (block.type === "code" || isGridOffsetType(block.type));
  if (!shouldNormalizeOffsetRows) {
    return blockRaw;
  }
  const fallbackRows = toFiniteNumber(
    pick(block.offsetRows, block.rowOffset),
    0,
  );
  const normalizedOffsetRows = Number.isFinite(fallbackRows)
    ? Math.max(0, Math.round(fallbackRows))
    : 0;
  return {
    ...block,
    offsetRows: normalizedOffsetRows,
    rowOffset: undefined,
  };
};
const normalizeCardBlock = (
  blockRaw: unknown,
  side: "question" | "answer",
  cardId: string,
  index: number,
): CardBlock | null => {
  const block = asRecord(blockRaw);
  if (!block) return null;
  const explicitType = isCardBlockType(block.type) ? block.type : null;
  const type: CardBlock["type"] = explicitType ?? "text";
  const id = toStringOr(block.id, "") || `${side}-${type}-${cardId}-${index}`;
  const normalized: CardBlock = {
    id,
    type,
    orderIndex: index,
  };
  const parentBlockId =
    typeof block.parentBlockId === "string" ? block.parentBlockId : null;
  if (parentBlockId !== null) normalized.parentBlockId = parentBlockId;
  else if (block.parentBlockId === null) normalized.parentBlockId = null;
  const rowOffset = toFiniteNumber(block.rowOffset, 0);
  if (block.rowOffset !== undefined && Number.isFinite(rowOffset)) {
    normalized.rowOffset = Math.round(rowOffset);
  }
  const offsetRows = toFiniteNumber(block.offsetRows, 0);
  if (block.offsetRows !== undefined && Number.isFinite(offsetRows)) {
    normalized.offsetRows = Math.round(offsetRows);
  }
  switch (type) {
    case "text": {
      const content =
        explicitType === "text"
          ? toStringOr(block.content, "")
          : resolveFallbackTextContent(block);
      if (!content.trim()) return null;
      normalized.content = content;
      break;
    }
    case "markdown": {
      const markdown = toStringOr(block.markdown, "");
      if (!markdown.trim()) return null;
      normalized.markdown = markdown;
      break;
    }
    case "code": {
      const code = asRecord(block.code);
      const codeText = toStringOr(code?.code, "");
      if (!codeText.trim()) return null;
      normalized.code = {
        language: toStringOr(code?.language, "text").trim() ?? "text",
        code: codeText,
      };
      break;
    }
    case "image": {
      const images = normalizeUploadedImages(block.images ?? []) as NonNullable<CardBlock["images"]>;
      if (images.length === 0) return null;
      normalized.images = images;
      break;
    }
    case "pdf": {
      const pdf = normalizeUploadedPdf(block.pdf);
      if (!pdf) return null;
      normalized.pdf = pdf;
      normalized.pdfPageNumber = Math.max(1, Math.round(toFiniteNumber(block.pdfPageNumber, 1)));
      break;
    }
    case "audio": {
      const audios = toArrayOr(block.audios, []).filter(asRecord) as NonNullable<CardBlock["audios"]>;
      if (audios.length === 0) return null;
      normalized.audios = audios;
      break;
    }
    case "reference": {
      const references = toArrayOr(block.references, []).filter(asRecord) as NonNullable<CardBlock["references"]>;
      if (references.length === 0) return null;
      normalized.references = references;
      break;
    }
    case "math": {
      const math = asRecord(block.math);
      const latex = toStringOr(math?.latex, "");
      if (!latex.trim()) return null;
      normalized.math = {
        latex,
        displayMode: math?.displayMode === "inline" ? "inline" : "block",
      };
      break;
    }
    case "question": {
      const questionTitle = toStringOr(block.questionTitle, "");
      const questionAnswer = toStringOr(block.questionAnswer, "");
      if (!questionTitle.trim() && !questionAnswer.trim()) return null;
      normalized.questionTitle = questionTitle;
      normalized.questionAnswer = questionAnswer;
      break;
    }
  }
  return normalizeBlockOffsets(normalized) as CardBlock;
};
const normalizeCard = (raw: unknown): Card => {
  const record = asRecord(raw) ?? {};
  const id =
    toStringOr(pick(record.id, record.cardId, record.card_id), "") ||
    makeFallbackId();
  const legacyQuestionExtraRows = normalizeExtraRows(
    toFiniteNumber(
      pick(record.questionExtraRows, record.question_extra_rows),
      0,
    ),
  );
  const legacyAnswerExtraRows = normalizeExtraRows(
    toFiniteNumber(pick(record.answerExtraRows, record.answer_extra_rows), 0),
  );
  const migratedLayoutRows =
    LEGACY_BASE_LAYOUT_ROWS +
    Math.max(legacyQuestionExtraRows, legacyAnswerExtraRows);
  const levelNum = toFiniteNumber(
    pick(record.currentLevel, record.current_level, record.level),
    0,
  );
  const rawMemoryStability = pick(
    record.memoryStability,
    record.memory_stability,
  );
  const memoryStabilityNumber =
    typeof rawMemoryStability === "number"
      ? rawMemoryStability
      : typeof rawMemoryStability === "string"
        ? Number(rawMemoryStability)
        : undefined;
  const finiteMemoryStability =
    typeof memoryStabilityNumber === "number" &&
      Number.isFinite(memoryStabilityNumber)
      ? memoryStabilityNumber
      : undefined;
  const normalizeBlocksWithFallback = (
    side: "question" | "answer",
    blocks: unknown[],
    text: string,
    code: unknown,
    images: unknown[],
    audios: unknown[],
    options?: { allowLegacyFallback?: boolean; },
  ): CardBlock[] => {
    const normalizedBlocks = toArrayOr(blocks, [])
      .map((block, index) => normalizeCardBlock(block, side, id, index))
      .filter((block): block is CardBlock => block !== null);
    if (normalizedBlocks.length > 0) return normalizedBlocks;
    if (options?.allowLegacyFallback === false) return [];
    const fallbackBlocks: CardBlock[] = [];
    let index = 0;
    if (text) {
      fallbackBlocks.push({
        id: `${side === "question" ? "q" : "a"}-text-${id}`,
        type: "text",
        content: text,
        orderIndex: index++,
      });
    }
    if (code) {
      fallbackBlocks.push({
        id: `${side === "question" ? "q" : "a"}-code-${id}`,
        type: "code",
        code: code as CardBlock["code"],
        orderIndex: index++,
      });
    }
    if (Array.isArray(images) && images.length > 0) {
      fallbackBlocks.push({
        id: `${side === "question" ? "q" : "a"}-img-${id}`,
        type: "image",
        images: normalizeUploadedImages(images) as NonNullable<CardBlock["images"]>,
        orderIndex: index++,
      });
    }
    if (Array.isArray(audios) && audios.length > 0) {
      fallbackBlocks.push({
        id: `${side === "question" ? "q" : "a"}-audio-${id}`,
        type: "audio",
        audios: audios as CardBlock["audios"],
        orderIndex: index++,
      });
    }
    return fallbackBlocks;
  };
  const fields = asRecord(record.fields);
  const frontText = toStringOr(
    pick(
      record.questionText,
      record.question_text,
      record.front,
      record.question,
      record.q,
      fields?.Front,
      fields?.Question,
    ),
    "",
  );
  const backText = toStringOr(
    pick(
      record.answerText,
      record.answer_text,
      record.back,
      record.answer,
      record.a,
      fields?.Back,
      fields?.Answer,
    ),
    "",
  );
  const frontCode = pick(record.questionCode, record.question_code, null);
  const backCode = pick(record.answerCode, record.answer_code, null);
  const frontImages = toArrayOr(
    pick(record.questionImages, record.question_images),
    [],
  );
  const backImages = toArrayOr(
    pick(record.answerImages, record.answer_images),
    [],
  );
  const frontAudios = toArrayOr(
    pick(record.questionAudios, record.question_audios),
    [],
  );
  const backAudios = toArrayOr(
    pick(record.answerAudios, record.answer_audios),
    [],
  );
  const frontFace = asRecord(record.front);
  const backFace = asRecord(record.back);
  const hasFrontFaceBlocks = Array.isArray(frontFace?.blocks);
  const hasBackFaceBlocks = Array.isArray(backFace?.blocks);
  const frontBlocks = normalizeBlocksWithFallback(
    "question",
    hasFrontFaceBlocks
      ? (frontFace?.blocks as unknown[])
      : toArrayOr(pick(record.questionBlocks, record.question_blocks), []),
    frontText,
    frontCode,
    frontImages,
    frontAudios,
    { allowLegacyFallback: !hasFrontFaceBlocks },
  );
  const backBlocks = normalizeBlocksWithFallback(
    "answer",
    hasBackFaceBlocks
      ? (backFace?.blocks as unknown[])
      : toArrayOr(pick(record.answerBlocks, record.answer_blocks), []),
    backText,
    backCode,
    backImages,
    backAudios,
    { allowLegacyFallback: !hasBackFaceBlocks },
  );
  const normalized: Card & {
    question: string;
    answer: string;
    questionBlocks: CardBlock[];
    answerBlocks: CardBlock[];
    level: number;
    lastReviewedAt: Date | null;
    subjectiveScore?: SubjectiveScoreValue;
    learningStartedAt?: Date;
  } = {
    id,
    userId: toStringOr(pick(record.userId, record.user_id), ""),
    deviceId: toStringOr(pick(record.deviceId, record.device_id), ""),
    folderId: toStringOr(pick(record.folderId, record.folder_id), ""),
    cardSetId: toStringOr(pick(record.cardSetId, record.card_set_id), ""),
    orderIndex: Math.max(0, Math.round(toFiniteNumber(pick(record.orderIndex, record.order_index), 0))),
    questionNumber: toStringOr(pick(record.questionNumber, record.question_number), ""),
    question: frontText,
    answer: backText,
    front: {
      blocks: frontBlocks,
      ink: normalizeInkDocument(pick(frontFace?.ink, record.questionInk, record.question_ink)) ?? null,
    },
    back: {
      blocks: backBlocks,
      ink: normalizeInkDocument(pick(backFace?.ink, record.answerInk, record.answer_ink)) ?? null,
    },
    questionBlocks: frontBlocks,
    answerBlocks: backBlocks,
    currentLevel: Math.max(0, Math.round(levelNum)),
    level: Math.max(0, Math.round(levelNum)),
    layoutRows: normalizeLayoutRows(
      pick(record.layoutRows, record.layout_rows, migratedLayoutRows),
    ),
    memoryStability: normalizeMemoryStability(finiteMemoryStability),
    lastReviewedAt: normalizeDate(pick(record.lastReviewedAt, record.last_reviewed_at)),
    nextReviewDate: normalizeDate(pick(record.nextReviewDate, record.next_review_date)),
    createdAt: normalizeDate(pick(record.createdAt, record.created_at)) ?? new Date(),
    updatedAt: normalizeDate(pick(record.updatedAt, record.updated_at)) ?? new Date(),
    isDeleted: toBoolOr(pick(record.isDeleted, record.is_deleted), false),
    isDraft: toBoolOr(pick(record.isDraft, record.is_draft), false),
    hasUncertainty: toBoolOr(pick(record.hasUncertainty, record.has_uncertainty), false),
    isCompleted: toBoolOr(pick(record.isCompleted, record.is_completed), false),
    isSilent: toBoolOr(pick(record.isSilent, record.is_silent), false),
    reviewLogs: normalizeReviewLogs(pick(record.reviewLogs, record.review_logs)),
  };
  const subjectiveScore = normalizeSubjectiveScore(
    pick(record.subjectiveScore, record.subjective_score),
  );
  if (subjectiveScore !== undefined) normalized.subjectiveScore = subjectiveScore;
  const reviewCount = normalizeOptionalNumber(pick(record.reviewCount, record.review_count));
  if (reviewCount !== undefined) normalized.reviewCount = reviewCount;
  const recoveryRemaining = normalizeOptionalNumber(pick(record.recoveryRemaining, record.recovery_remaining));
  if (recoveryRemaining !== undefined) normalized.recoveryRemaining = recoveryRemaining;
  const learningStartedAt = normalizeDate(pick(record.learningStartedAt, record.learning_started_at));
  if (learningStartedAt !== null) normalized.learningStartedAt = learningStartedAt;
  const inkDocument = normalizeInkDocument(pick(record.inkDocument, record.ink_document));
  if (inkDocument !== undefined) normalized.inkDocument = inkDocument;
  return normalized;
};



export { normalizeCard };
