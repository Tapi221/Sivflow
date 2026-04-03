import { normalizeUploadedImages } from "./uploaded-image/normalizer";
import { normalizeMemoryStability } from "./reviewUtils";
import { normalizeInkDocument } from "@/components/ink/inkTypes";
import {
  LEGACY_BASE_LAYOUT_ROWS,
  normalizeExtraRows,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";
import { isGridOffsetType } from "@/components/card/frame/rowOffset";
import type { Card, CardBlock } from "@/types/domain/card";

type UnknownRecord = Record<string, unknown>;

const asRecord = (v: unknown): UnknownRecord | null => {
  return v !== null && typeof v === "object" ? (v as UnknownRecord) : null;
};

const pick = (...vals: unknown[]): unknown => {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
};

const toStringOr = (v: unknown, fallback = ""): string => {
  return typeof v === "string" ? v : fallback;
};

const toBoolOr = (v: unknown, fallback = false): boolean => {
  return typeof v === "boolean" ? v : fallback;
};

const toFiniteNumber = (v: unknown, fallback: number): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const toArrayOr = (v: unknown, fallback: unknown[] = []): unknown[] => {
  return Array.isArray(v) ? v : fallback;
};

// ページ名から URL パスを作成
// クエリパラメータ付きの場合も対応（例: 'CardEdit?folderId=xxx'）
export const createPageUrl = (pageName: string): string => {
  const mapping: Record<string, string> = {
    Dashboard: "/folders",
    dashboard: "/folders",
    Folders: "/folders",
    folders: "/folders",
    CardEdit: "/CardEdit",
    CardView: "/CardView",
    StudyMode: "/study",
    study: "/study",
    UncertainMode: "/uncertain",
    uncertain: "/uncertain",
    BookmarkMode: "/bookmark",
    bookmark: "/bookmark",
    Calendar: "/calendar",
    calendar: "/calendar",
    Gallery: "/gallery",
    gallery: "/gallery",
    OneQAMode: "/one-qa-mode",
    PairMode: "/pair-mode",
    FourChoiceMode: "/four-choice-mode",
    Statistics: "/statistics",
    Trash: "/trash",
  };

  // クエリパラメータを分離
  const [baseName, queryString] = pageName.split("?");
  const basePath = mapping[baseName];

  if (basePath) {
    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  // マッピングにない場合はそのままパスとして返す（クエリパラメータも保持）
  return queryString
    ? `/${baseName}?${queryString}`
    : `/${baseName.toLowerCase()}`;
};

const makeFallbackId = () => {
  // crypto.randomUUID が使える環境ならそれ、無理なら雑に一意っぽいやつ
  try {
    const c = globalThis.crypto as unknown;
    const rec = asRecord(c);
    const fn = rec ? rec.randomUUID : undefined;
    if (typeof fn === "function") return (fn as () => string)();
  } catch {
    // ignore: randomUUID not available
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;

  // Firestore Timestamp
  const rec = asRecord(value);
  if (rec && typeof rec.toDate === "function") {
    const d = (rec.toDate as () => unknown)();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }

  // Already a Date
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  // Firestore-like plain object timestamp
  if (rec) {
    const seconds =
      typeof rec.seconds === "number"
        ? rec.seconds
        : typeof rec._seconds === "number"
          ? rec._seconds
          : null;
    const nanoseconds =
      typeof rec.nanoseconds === "number"
        ? rec.nanoseconds
        : typeof rec._nanoseconds === "number"
          ? rec._nanoseconds
          : 0;

    if (seconds !== null) {
      const ms = seconds * 1000 + Math.floor(nanoseconds / 1e6);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // Numeric epoch milliseconds/seconds
  if (typeof value === "number") {
    // 10桁前後は "秒" の可能性が高い → ms に補正
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO/date string（数値文字列も吸収）
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // "1700000000" / "1700000000000" みたいな数値文字列
    if (/^\d{10,13}$/.test(trimmed)) {
      const n = Number(trimmed);
      const ms = n < 1e12 ? n * 1000 : n;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback: unknown type → null（無効な時間値回避）
  return null;
};

type NormalizedReviewLog = {
  reviewedAt: string;
  rating: 1 | 2 | 3 | 4;
  resistanceScore: number;
  durationMinutes: number | null;
};

const normalizeReviewLogs = (rawLogs: unknown): NormalizedReviewLog[] => {
  if (!Array.isArray(rawLogs)) return [];

  const pickNumber = (v: unknown): number | null => {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
      if (v.trim() === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const clampRating = (n: number): 1 | 2 | 3 | 4 | null => {
    const r = Math.round(n);
    if (r < 1 || r > 4) return null;
    return r as 1 | 2 | 3 | 4;
  };

  const subjectiveScoreToRating = (n: number): 1 | 2 | 3 | 4 | null => {
    const rounded = Math.round(n);
    // Canonical subjectiveScore scale: 0..3 -> rating: 1..4
    if (rounded >= 0 && rounded <= 3) {
      return (rounded + 1) as 1 | 2 | 3 | 4;
    }
    // Tolerate inconsistent legacy data that already stores 1..4 here
    return clampRating(rounded);
  };

  const normalized = rawLogs
    .map((item) => {
      const log = asRecord(item);
      if (!log) return null;

      const reviewed = normalizeDate(pick(log.reviewedAt, log.reviewed_at));

      // ✅ rating が無いログを捨てない（subjectiveScore 系も拾う）
      const directRatingRaw = pickNumber(
        pick(log.rating, log.ratingNum, log.rating_num),
      );
      const subjectiveScoreRaw = pickNumber(
        pick(log.subjectiveScore, log.subjective_score),
      );
      const lastSubjectiveScoreRaw = pickNumber(
        pick(log.lastSubjectiveScore, log.last_subjective_score),
      );
      const directRating =
        directRatingRaw === null ? null : clampRating(directRatingRaw);
      const subjectiveRating =
        subjectiveScoreRaw === null
          ? null
          : subjectiveScoreToRating(subjectiveScoreRaw);
      const lastSubjectiveRating =
        lastSubjectiveScoreRaw === null
          ? null
          : subjectiveScoreToRating(lastSubjectiveScoreRaw);

      const scoreRaw = pickNumber(
        pick(
          log.resistanceScore,
          log.resistance_score,
          log.endurance,
          log.endurance_score,
        ),
      );
      const scoreNum = scoreRaw ?? 0;
      const durationMinutesRaw = pickNumber(
        pick(
          log.durationMinutes,
          log.duration_minutes,
          log.durationMin,
          log.duration_min,
        ),
      );

      if (!reviewed) return null;

      const rating = directRating ?? subjectiveRating ?? lastSubjectiveRating;
      if (rating === null) return null;

      return {
        reviewedAt: reviewed.toISOString(),
        rating,
        resistanceScore: Math.max(0, Math.min(100, scoreNum)),
        durationMinutes:
          durationMinutesRaw === null ? null : Math.max(0, Math.round(durationMinutesRaw)),
      } satisfies NormalizedReviewLog;
    })
    .filter((v): v is NormalizedReviewLog => v !== null);

  normalized.sort(
    (a, b) =>
      new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime(),
  );
  return normalized;
};

export const extractTextFromBlocks = (blocks: unknown[]): string => {
  if (!Array.isArray(blocks)) return "";
  // 最初に見つかった非空のテキスト系コンテンツを返す
  for (const b of blocks) {
    const block = asRecord(b);
    if (!block) continue;

    if (
      block.type === "text" &&
      typeof block.content === "string" &&
      block.content.trim()
    ) {
      return block.content.trim();
    }
    if (
      block.type === "markdown" &&
      typeof block.markdown === "string" &&
      block.markdown.trim()
    ) {
      return block.markdown.trim();
    }
    if (block.type === "code") {
      const codeObj = asRecord(block.code);
      const code = codeObj ? codeObj.code : undefined;
      if (typeof code === "string" && code.trim())
        return code.split("\n")[0].trim();
    }
  }
  return "";
};

type GridBlockType = Parameters<typeof isGridOffsetType>[0];

const isGridBlockType = (v: unknown): v is GridBlockType => {
  return (
    v === "text" ||
    v === "markdown" ||
    v === "code" ||
    v === "image" ||
    v === "audio" ||
    v === "reference" ||
    v === "math"
  );
};

const CARD_BLOCK_TYPES = new Set<CardBlock["type"]>([
  "text",
  "question",
  "code",
  "image",
  "audio",
  "reference",
  "math",
  "markdown",
]);

const isCardBlockType = (value: unknown): value is CardBlock["type"] =>
  typeof value === "string" &&
  CARD_BLOCK_TYPES.has(value as CardBlock["type"]);

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

const normalizeBlockOffsets = (blockRaw: unknown) => {
  const block = asRecord(blockRaw);
  if (!block) return blockRaw;

  const type = block.type;
  if (!isGridBlockType(type)) return blockRaw;
  if (!isGridOffsetType(type)) return blockRaw;

  const fallbackRows = toFiniteNumber(pick(block.offsetRows, block.rowOffset), 0);
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
        language: toStringOr(code?.language, "text").trim() || "text",
        code: codeText,
      };
      break;
    }
    case "image": {
      const images = normalizeUploadedImages(
        block.images ?? [],
      ) as NonNullable<CardBlock["images"]>;
      if (images.length === 0) return null;
      normalized.images = images;
      break;
    }
    case "audio": {
      const audios = toArrayOr(block.audios, []).filter(asRecord) as NonNullable<
        CardBlock["audios"]
      >;
      if (audios.length === 0) return null;
      normalized.audios = audios;
      break;
    }
    case "reference": {
      const references = toArrayOr(block.references, []).filter(asRecord) as NonNullable<
        CardBlock["references"]
      >;
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

export const normalizeCard = (raw: unknown): Card => {
  const r = asRecord(raw) ?? {};

  // ★ 変更: id が無い raw が来た時に undefined をばら撒かない
  const id =
    toStringOr(pick(r.id, r.cardId, r.card_id), "") || makeFallbackId();

  const legacyQuestionExtraRows = normalizeExtraRows(
    toFiniteNumber(pick(r.questionExtraRows, r.question_extra_rows), 0),
  );
  const legacyAnswerExtraRows = normalizeExtraRows(
    toFiniteNumber(pick(r.answerExtraRows, r.answer_extra_rows), 0),
  );
  const migratedLayoutRows =
    LEGACY_BASE_LAYOUT_ROWS +
    Math.max(legacyQuestionExtraRows, legacyAnswerExtraRows);

  // ✅ TS2345 対策：currentLevel を number に正規化してから使う
  const rawLevel = pick(r.currentLevel, r.current_level, r.level);
  const levelNum = toFiniteNumber(rawLevel, 0);

  const rawMs = pick(r.memoryStability, r.memory_stability);
  const msNum =
    typeof rawMs === "number"
      ? rawMs
      : typeof rawMs === "string"
        ? Number(rawMs)
        : undefined;
  const msNumFinite =
    typeof msNum === "number" && Number.isFinite(msNum) ? msNum : undefined;

  const normalizeBlocksWithFallback = (
    side: "question" | "answer",
    blocks: unknown[],
    text: string,
    code: unknown,
    images: unknown[],
    audios: unknown[],
    options?: { allowLegacyFallback?: boolean },
  ): CardBlock[] => {
    const normalizedBlocks = toArrayOr(blocks, [])
      .map((block, index) => normalizeCardBlock(block, side, id, index))
      .filter((block): block is CardBlock => block !== null);

    if (normalizedBlocks.length > 0) {
      return normalizedBlocks;
    }

    if (options?.allowLegacyFallback === false) {
      return [];
    }

    const fallbackBlocks: CardBlock[] = [];
    let idx = 0;

    if (text) {
      fallbackBlocks.push({
        id: `${side === "question" ? "q" : "a"}-text-${id}`,
        type: "text",
        content: text,
        orderIndex: idx++,
      });
    }

    if (code) {
      fallbackBlocks.push({
        id: `${side === "question" ? "q" : "a"}-code-${id}`,
        type: "code",
        code: code as CardBlock["code"],
        orderIndex: idx++,
      });
    }

    if (Array.isArray(images) && images.length > 0) {
      fallbackBlocks.push({
        id: `${side === "question" ? "q" : "a"}-img-${id}`,
        type: "image",
        images: normalizeUploadedImages(images) as NonNullable<CardBlock["images"]>,
        orderIndex: idx++,
      });
    }

    if (Array.isArray(audios) && audios.length > 0) {
      fallbackBlocks.push({
        id: `${side === "question" ? "q" : "a"}-audio-${id}`,
        type: "audio",
        audios: audios as CardBlock["audios"],
        orderIndex: idx++,
      });
    }

    return fallbackBlocks;
  };

  const frontText = toStringOr(
    pick(
      r.questionText,
      r.question_text,
      r.front,
      r.question,
      r.q,
      asRecord(r.fields)?.Front,
      asRecord(r.fields)?.Question,
    ),
    "",
  );
  const backText = toStringOr(
    pick(
      r.answerText,
      r.answer_text,
      r.back,
      r.answer,
      r.a,
      asRecord(r.fields)?.Back,
      asRecord(r.fields)?.Answer,
    ),
    "",
  );
  const frontCode = pick(r.questionCode, r.question_code, null);
  const backCode = pick(r.answerCode, r.answer_code, null);
  const frontImages = toArrayOr(pick(r.questionImages, r.question_images), []);
  const backImages = toArrayOr(pick(r.answerImages, r.answer_images), []);
  const frontAudios = toArrayOr(pick(r.questionAudios, r.question_audios), []);
  const backAudios = toArrayOr(pick(r.answerAudios, r.answer_audios), []);
  const frontFace = asRecord(r.front);
  const backFace = asRecord(r.back);
  const hasFrontFaceBlocks = Array.isArray(frontFace?.blocks);
  const hasBackFaceBlocks = Array.isArray(backFace?.blocks);
  const frontBlocks = normalizeBlocksWithFallback(
    "question",
    hasFrontFaceBlocks
      ? (frontFace?.blocks as unknown[])
      : toArrayOr(pick(r.questionBlocks, r.question_blocks), []),
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
      : toArrayOr(pick(r.answerBlocks, r.answer_blocks), []),
    backText,
    backCode,
    backImages,
    backAudios,
    { allowLegacyFallback: !hasBackFaceBlocks },
  );

  const normalized: Card = {
    id,
    userId: toStringOr(pick(r.userId, r.user_id), ""),
    deviceId: toStringOr(pick(r.deviceId, r.device_id), ""),
    folderId: toStringOr(pick(r.folderId, r.folder_id), ""),
    cardSetId: toStringOr(pick(r.cardSetId, r.card_set_id), ""),
    orderIndex: toFiniteNumber(pick(r.orderIndex, r.order_index), 0),
    questionNumber: toStringOr(pick(r.questionNumber, r.question_number), ""),
    title: toStringOr(r.title, ""),
    isDraft: toBoolOr(pick(r.isDraft, r.is_draft), false),
    hasUncertainty: toBoolOr(pick(r.hasUncertainty, r.has_uncertainty), false),
    isBookmarked: toBoolOr(pick(r.isBookmarked, r.is_bookmarked), false),
    isCompleted: toBoolOr(pick(r.isCompleted, r.is_completed), false),
    isSilent: toBoolOr(pick(r.isSilent, r.is_silent), false),
    isDeleted: toBoolOr(pick(r.isDeleted, r.is_deleted), false),
    deletedAt: (() => {
      const rawDeletedAt = pick(r.deletedAt, r.deleted_at);
      if (rawDeletedAt) return normalizeDate(rawDeletedAt);

      const isDeleted = toBoolOr(pick(r.isDeleted, r.is_deleted), false);
      if (isDeleted) {
        return (
          normalizeDate(
            pick(r.updatedAt, r.updated_at, r.createdAt, r.created_at),
          ) ?? new Date(0)
        );
      }
      return null;
    })(),
    front: {
      blocks: frontBlocks,
      ink: (() => {
        const doc = normalizeInkDocument(
          pick(r.inkQuestion, r.ink_question, asRecord(r.front)?.ink, null),
        );
        return doc.strokes.length > 0 ? doc : null;
      })(),
      extraRows: legacyQuestionExtraRows,
    },
    back: {
      blocks: backBlocks,
      ink: (() => {
        const doc = normalizeInkDocument(
          pick(r.inkAnswer, r.ink_answer, asRecord(r.back)?.ink, null),
        );
        return doc.strokes.length > 0 ? doc : null;
      })(),
      extraRows: legacyAnswerExtraRows,
    },
    layoutRows: normalizeLayoutRows(
      toFiniteNumber(pick(r.layoutRows, r.layout_rows), migratedLayoutRows),
    ),

    // ✅ ここが修正点：levelNum を渡す
    memoryStability: normalizeMemoryStability(msNumFinite, levelNum),
    currentLevel: levelNum,

    nextReviewDate: normalizeDate(pick(r.nextReviewDate, r.next_review_date)),
    lastReviewAt: normalizeDate(pick(r.lastReviewAt, r.last_review_at)),

    lastSubjectiveScore: pick(r.lastSubjectiveScore, r.last_subjective_score),
    recoveryRemaining: pick(r.recoveryRemaining, r.recovery_remaining),
    lastReviewDelayDays: pick(r.lastReviewDelayDays, r.last_review_delay_days),

    createdAt: normalizeDate(pick(r.createdAt, r.created_at)) ?? new Date(),
    updatedAt: normalizeDate(pick(r.updatedAt, r.updated_at)) ?? new Date(),

    responseTimeMs: pick(r.responseTimeMs, r.response_time_ms),
    uncertaintyMarkedDate: normalizeDate(
      pick(r.uncertaintyMarkedDate, r.uncertainty_marked_date),
    ),
    completedDate: normalizeDate(pick(r.completedDate, r.completed_date)),

    tags: toArrayOr(r.tags, []),
    ...(Array.isArray(r.tagIds)
      ? {
          tagIds: r.tagIds.filter(
            (x: unknown): x is string => typeof x === "string",
          ),
        }
      : {}),
    reviewCount: toFiniteNumber(pick(r.reviewCount, r.review_count), 0),
    reviewLogs: normalizeReviewLogs(pick(r.reviewLogs, r.review_logs, [])),
    _rescueRaw: pick(r._rescueRaw, undefined),
  };

  return normalized;
};

/**
 * フォルダデータを正規化する関数
 * snake_case / camelCase の差異を吸収し、削除状態を一貫して処理する
 */
export const normalizeFolder = (raw: unknown) => {
  const r = asRecord(raw) ?? {};
  const id =
    toStringOr(pick(r.id, r.folderId, r.folder_id), "") || makeFallbackId();

  const isDeleted = toBoolOr(pick(r.isDeleted, r.is_deleted), false);

  // deletedAt: isDeleted=true なのに deletedAt がない場合は updatedAt で補完
  const rawDeletedAt = pick(r.deletedAt, r.deleted_at);
  let deletedAt: Date | null = null;
  if (rawDeletedAt) {
    deletedAt = normalizeDate(rawDeletedAt);
  } else if (isDeleted) {
    // isDeleted=true だが deletedAt がない → updatedAt で推定補完
    deletedAt =
      normalizeDate(
        pick(r.updatedAt, r.updated_at, r.createdAt, r.created_at),
      ) ?? new Date(0);
  }

  return {
    id,
    folderId: id,
    userId: toStringOr(pick(r.userId, r.user_id), ""),
    deviceId: toStringOr(pick(r.deviceId, r.device_id), ""),
    parentFolderId: pick(r.parentFolderId, r.parent_folder_id, null) as
      | string
      | null,
    folderName: toStringOr(pick(r.folderName, r.folder_name), ""),
    folderColor: pick(r.folderColor, r.folder_color, null),
    orderIndex: toFiniteNumber(pick(r.orderIndex, r.order_index), 0),
    cloudSyncEnabled: toBoolOr(
      pick(r.cloudSyncEnabled, r.cloud_sync_enabled),
      true,
    ),
    isDeleted,
    deletedAt,
    isHidden: toBoolOr(pick(r.isHidden, r.is_hidden), false),
    isSilent: toBoolOr(pick(r.isSilent, r.is_silent), false),
    notePdfs: toArrayOr(pick(r.notePdfs, r.note_pdfs), []),
    lastAccessAt: normalizeDate(pick(r.lastAccessAt, r.last_access_at)),
    createdAt: normalizeDate(pick(r.createdAt, r.created_at)) ?? new Date(),
    updatedAt: normalizeDate(pick(r.updatedAt, r.updated_at)) ?? new Date(),
  };
};






