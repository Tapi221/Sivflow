import { normalizeUploadedImages } from "./uploaded-image/normalizer";
import { normalizeMemoryStability } from "./reviewUtils";
import { normalizeInkDocument } from "@/components/ink/inkTypes";
import {
  LEGACY_BASE_LAYOUT_ROWS,
  normalizeExtraRows,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";
import { isGridOffsetType } from "@/components/card/frame/rowOffset";

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

  const normalized = rawLogs
    .map((item) => {
      const log = asRecord(item);
      if (!log) return null;

      const reviewed = normalizeDate(pick(log.reviewedAt, log.reviewed_at));

      // ✅ rating が無いログを捨てない（subjectiveScore 系も拾う）
      const ratingRaw =
        pickNumber(pick(log.rating, log.ratingNum, log.rating_num)) ??
        pickNumber(pick(log.subjectiveScore, log.subjective_score)) ??
        pickNumber(pick(log.lastSubjectiveScore, log.last_subjective_score));

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

      if (!reviewed || ratingRaw === null) return null;

      const rating = clampRating(ratingRaw);
      if (!rating) return null;

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

export const normalizeCard = (raw: unknown) => {
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

  const normalizeBlockOffsets = (blockRaw: unknown) => {
    const block = asRecord(blockRaw);
    if (!block) return blockRaw;

    const type = block.type;
    if (!isGridBlockType(type)) return blockRaw;
    if (!isGridOffsetType(type)) return blockRaw;

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

  const normalized: UnknownRecord = {
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

    // deletedAt: isDeleted=true なのに deletedAt がない場合は updatedAt で補完
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

    questionText: toStringOr(
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
    ),
    questionImages: normalizeUploadedImages(
      toArrayOr(pick(r.questionImages, r.question_images), []),
    ),
    questionAudios: toArrayOr(pick(r.questionAudios, r.question_audios), []),
    questionCode: pick(r.questionCode, r.question_code, null),
    questionTextHighlighted: toStringOr(r.questionTextHighlighted, ""),
    questionMarked: toStringOr(pick(r.questionMarked, r.question_marked), ""),

    answerText: toStringOr(
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
    ),
    answerImages: normalizeUploadedImages(
      toArrayOr(pick(r.answerImages, r.answer_images), []),
    ),
    answerAudios: toArrayOr(pick(r.answerAudios, r.answer_audios), []),
    answerCode: pick(r.answerCode, r.answer_code, null),
    answerTextHighlighted: toStringOr(r.answerTextHighlighted, ""),
    answerMarked: toStringOr(pick(r.answerMarked, r.answer_marked), ""),

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

    questionBlocks: toArrayOr(pick(r.questionBlocks, r.question_blocks), [])
      .map(normalizeBlockOffsets)
      .filter((b) => {
        const br = asRecord(b);
        if (!br) return false;

        if (br.type === "math") {
          const math = asRecord(br.math);
          const latex = math ? toStringOr(math.latex, "") : "";
          if (!latex.trim()) return false;
        }
        return true;
      }),

    answerBlocks: toArrayOr(pick(r.answerBlocks, r.answer_blocks), [])
      .map(normalizeBlockOffsets)
      .filter((b) => {
        const br = asRecord(b);
        if (!br) return false;

        if (br.type === "math") {
          const math = asRecord(br.math);
          const latex = math ? toStringOr(math.latex, "") : "";
          if (!latex.trim()) return false;
        }
        return true;
      }),

    layoutRows: normalizeLayoutRows(
      toFiniteNumber(pick(r.layoutRows, r.layout_rows), migratedLayoutRows),
    ),

    // Legacy互換の読み取り専用。高さロジックは layoutRows のみを参照する。
    questionExtraRows: legacyQuestionExtraRows,
    answerExtraRows: legacyAnswerExtraRows,

    inkQuestion: (() => {
      const doc = normalizeInkDocument(
        pick(r.inkQuestion, r.ink_question, null),
      );
      return doc.strokes.length > 0 ? doc : null;
    })(),
    inkAnswer: (() => {
      const doc = normalizeInkDocument(pick(r.inkAnswer, r.ink_answer, null));
      return doc.strokes.length > 0 ? doc : null;
    })(),

    _rescueRaw: pick(r._rescueRaw, undefined),
  };

  // ブロックが空で、レガシーフィールドにデータがある場合に自動変換を行う
  if (
    Array.isArray(normalized.questionBlocks) &&
    normalized.questionBlocks.length === 0
  ) {
    const blocks: UnknownRecord[] = [];
    let idx = 0;

    const qText = normalized.questionText;
    const qCode = normalized.questionCode;
    const qImgs = normalized.questionImages;
    const qAudios = normalized.questionAudios;

    if (typeof qText === "string" && qText)
      blocks.push({
        id: `q-text-${id}`,
        type: "text",
        content: qText,
        orderIndex: idx++,
      });
    if (qCode)
      blocks.push({
        id: `q-code-${id}`,
        type: "code",
        code: qCode,
        orderIndex: idx++,
      });
    if (Array.isArray(qImgs) && qImgs.length > 0)
      blocks.push({
        id: `q-img-${id}`,
        type: "image",
        images: qImgs,
        orderIndex: idx++,
      });
    if (Array.isArray(qAudios) && qAudios.length > 0)
      blocks.push({
        id: `q-audio-${id}`,
        type: "audio",
        audios: qAudios,
        orderIndex: idx++,
      });

    normalized.questionBlocks = blocks;
  }

  if (
    Array.isArray(normalized.answerBlocks) &&
    normalized.answerBlocks.length === 0
  ) {
    const blocks: UnknownRecord[] = [];
    let idx = 0;

    const aText = normalized.answerText;
    const aCode = normalized.answerCode;
    const aImgs = normalized.answerImages;
    const aAudios = normalized.answerAudios;

    if (typeof aText === "string" && aText)
      blocks.push({
        id: `a-text-${id}`,
        type: "text",
        content: aText,
        orderIndex: idx++,
      });
    if (aCode)
      blocks.push({
        id: `a-code-${id}`,
        type: "code",
        code: aCode,
        orderIndex: idx++,
      });
    if (Array.isArray(aImgs) && aImgs.length > 0)
      blocks.push({
        id: `a-img-${id}`,
        type: "image",
        images: aImgs,
        orderIndex: idx++,
      });
    if (Array.isArray(aAudios) && aAudios.length > 0)
      blocks.push({
        id: `a-audio-${id}`,
        type: "audio",
        audios: aAudios,
        orderIndex: idx++,
      });

    normalized.answerBlocks = blocks;
  }

  // 逆にブロックはあるがレガシーフィールドが空の場合（ブロックエディタでの保存後など）
  if (
    !normalized.questionText &&
    Array.isArray(normalized.questionBlocks) &&
    normalized.questionBlocks.length > 0
  ) {
    normalized.questionText = extractTextFromBlocks(normalized.questionBlocks);
  }
  if (
    !normalized.answerText &&
    Array.isArray(normalized.answerBlocks) &&
    normalized.answerBlocks.length > 0
  ) {
    normalized.answerText = extractTextFromBlocks(normalized.answerBlocks);
  }

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





