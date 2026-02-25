import { normalizeUploadedImages } from './imageUtils';
import { normalizeMemoryStability } from './reviewUtils';
import { normalizeInkDocument } from '@/Components/ink/inkTypes';
import { DEFAULT_LAYOUT_ROWS, normalizeExtraRows, normalizeLayoutRows } from '@/domain/card/extraRows';

// ページ名から URL パスを作成
// クエリパラメータ付きの場合も対応（例: 'CardEdit?folderId=xxx'）
export const createPageUrl = (pageName: string): string => {
  const mapping: { [key: string]: string } = {
    'Dashboard': '/Dashboard',
    'dashboard': '/Dashboard',
    'Folders': '/folders',
    'folders': '/folders',
    'CardEdit': '/CardEdit',
    'CardView': '/CardView',
    'StudyMode': '/study',
    'study': '/study',
    'UncertainMode': '/uncertain',
    'uncertain': '/uncertain',
    'BookmarkMode': '/bookmark',
    'bookmark': '/bookmark',
    'Calendar': '/calendar',
    'calendar': '/calendar',
    'Gallery': '/gallery',
    'gallery': '/gallery',
    'OneQAMode': '/one-qa-mode',
    'PairMode': '/pair-mode',
    'FourChoiceMode': '/four-choice-mode',
    'Statistics': '/statistics',
    'Trash': '/trash'
  };
  
  // クエリパラメータを分離
  const [baseName, queryString] = pageName.split('?');
  const basePath = mapping[baseName];
  
  if (basePath) {
    return queryString ? `${basePath}?${queryString}` : basePath;
  }
  
  // マッピングにない場合はそのままパスとして返す（クエリパラメータも保持）
  return queryString ? `/${baseName}?${queryString}` : `/${baseName.toLowerCase()}`;
};

const makeFallbackId = () => {
  // crypto.randomUUID が使える環境ならそれ、無理なら雑に一意っぽいやつ
  try {
     
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeDate = (value: any) => {
  if (value === null || value === undefined) return null;

  // Firestore Timestamp
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }

  // Already a Date
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  // Firestore-like plain object timestamp
  if (typeof value === 'object') {
    const seconds =
      typeof value.seconds === 'number'
        ? value.seconds
        : typeof value._seconds === 'number'
          ? value._seconds
          : null;
    const nanoseconds =
      typeof value.nanoseconds === 'number'
        ? value.nanoseconds
        : typeof value._nanoseconds === 'number'
          ? value._nanoseconds
          : 0;

    if (seconds !== null) {
      const ms = seconds * 1000 + Math.floor(nanoseconds / 1e6);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // Numeric epoch milliseconds/seconds
  if (typeof value === 'number') {
    // 10桁前後は "秒" の可能性が高い → ms に補正
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO/date string（数値文字列も吸収）
  if (typeof value === 'string') {
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

const normalizeReviewLogs = (rawLogs: any): Array<{ reviewedAt: string; rating: 1 | 2 | 3 | 4; resistanceScore: number }> => {
  if (!Array.isArray(rawLogs)) return [];

  const normalized = rawLogs
    .map((log) => {
      const reviewed = normalizeDate(log?.reviewedAt ?? log?.reviewed_at);
      const ratingNum = Number(log?.rating);
      const scoreNum = Number(log?.resistanceScore ?? log?.resistance_score);
      if (!reviewed || !Number.isFinite(ratingNum) || !Number.isFinite(scoreNum)) return null;
      if (ratingNum < 1 || ratingNum > 4) return null;

      return {
        reviewedAt: reviewed.toISOString(),
        rating: ratingNum as 1 | 2 | 3 | 4,
        resistanceScore: Math.max(0, Math.min(100, scoreNum)),
      };
    })
    .filter((v): v is { reviewedAt: string; rating: 1 | 2 | 3 | 4; resistanceScore: number } => Boolean(v));

  normalized.sort((a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime());
  return normalized;
};

export const extractTextFromBlocks = (blocks: any[]): string => {
  if (!blocks || !Array.isArray(blocks)) return '';
  // 最初に見つかった非空のテキスト系コンテンツを返す
  for (const block of blocks) {
    if (block.type === 'text' && block.content) return block.content.trim();
    if (block.type === 'markdown' && block.markdown) return block.markdown.trim();
    if (block.type === 'code' && block.code?.code) return block.code.code.split('\n')[0].trim();
  }
  return '';
};

export const normalizeCard = (raw: any) => {
  // ★ 変更: id が無い raw が来た時に undefined をばら撒かない
  const id = raw?.id ?? raw?.cardId ?? raw?.card_id ?? makeFallbackId();

  const legacyQuestionExtraRows = normalizeExtraRows(raw?.questionExtraRows ?? raw?.question_extra_rows ?? 0);
  const legacyAnswerExtraRows = normalizeExtraRows(raw?.answerExtraRows ?? raw?.answer_extra_rows ?? 0);
  const migratedLayoutRows = DEFAULT_LAYOUT_ROWS + Math.max(legacyQuestionExtraRows, legacyAnswerExtraRows);
  const normalizeBlockOffsets = (block: any) => {
    if (!block || typeof block !== 'object') return block;
    if (block.type !== 'code') return block;

    const fallbackRows = Number(block.offsetRows ?? block.rowOffset ?? 0);
    const normalizedOffsetRows = Number.isFinite(fallbackRows)
      ? Math.max(0, Math.round(fallbackRows))
      : 0;

    return {
      ...block,
      offsetRows: normalizedOffsetRows,
      rowOffset: undefined,
    };
  };

  const normalized: any = {
    id,
    userId: raw?.userId ?? raw?.user_id ?? '',
    deviceId: raw?.deviceId ?? raw?.device_id ?? '',
    folderId: raw?.folderId ?? raw?.folder_id ?? '',
    orderIndex: raw?.orderIndex ?? raw?.order_index ?? 0,
    questionNumber: raw?.questionNumber ?? raw?.question_number ?? '',
    title: raw?.title ?? '',
    isDraft: raw?.isDraft ?? raw?.is_draft ?? false,
    hasUncertainty: raw?.hasUncertainty ?? raw?.has_uncertainty ?? false,
    isBookmarked: raw?.isBookmarked ?? raw?.is_bookmarked ?? false,
    isCompleted: raw?.isCompleted ?? raw?.is_completed ?? false,
    isSilent: raw?.isSilent ?? raw?.is_silent ?? false,
    isDeleted: raw?.isDeleted ?? raw?.is_deleted ?? false,

    // deletedAt: isDeleted=true なのに deletedAt がない場合は updatedAt で補完
    deletedAt: (() => {
      const rawDeletedAt = raw?.deletedAt ?? raw?.deleted_at;
      if (rawDeletedAt) return normalizeDate(rawDeletedAt);

      // isDeleted=true だが deletedAt がない → updatedAt で推定補完
      const isDeleted = raw?.isDeleted ?? raw?.is_deleted ?? false;
      if (isDeleted) {
        return normalizeDate(raw?.updatedAt ?? raw?.updated_at ?? raw?.createdAt ?? raw?.created_at) ?? new Date(0);
      }
      return null;
    })(),

    questionText: raw?.questionText ?? raw?.question_text ??
                  raw?.front ?? raw?.question ?? raw?.q ??
                  raw?.fields?.Front ?? raw?.fields?.Question ?? '',
    questionImages: normalizeUploadedImages(raw?.questionImages ?? raw?.question_images ?? []),
    questionAudios: raw?.questionAudios ?? raw?.question_audios ?? [],
    questionCode: raw?.questionCode ?? raw?.question_code ?? null,
    questionTextHighlighted: raw?.questionTextHighlighted ?? '',
    questionMarked: raw?.questionMarked ?? raw?.question_marked ?? '',

    answerText: raw?.answerText ?? raw?.answer_text ??
                raw?.back ?? raw?.answer ?? raw?.a ??
                raw?.fields?.Back ?? raw?.fields?.Answer ?? '',
    answerImages: normalizeUploadedImages(raw?.answerImages ?? raw?.answer_images ?? []),
    answerAudios: raw?.answerAudios ?? raw?.answer_audios ?? [],
    answerCode: raw?.answerCode ?? raw?.answer_code ?? null,
    answerTextHighlighted: raw?.answerTextHighlighted ?? '',
    answerMarked: raw?.answerMarked ?? raw?.answer_marked ?? '',

    memoryStability: normalizeMemoryStability(
      raw?.memoryStability ?? raw?.memory_stability,
      raw?.currentLevel ?? raw?.current_level ?? raw?.level
    ),
    currentLevel: raw?.currentLevel ?? raw?.current_level ?? raw?.level,

    nextReviewDate: normalizeDate(raw?.nextReviewDate ?? raw?.next_review_date),
    lastReviewAt: normalizeDate(raw?.lastReviewAt ?? raw?.last_review_at),

    lastSubjectiveScore: raw?.lastSubjectiveScore ?? raw?.last_subjective_score,
    recoveryRemaining: raw?.recoveryRemaining ?? raw?.recovery_remaining,
    lastReviewDelayDays: raw?.lastReviewDelayDays ?? raw?.last_review_delay_days,

    createdAt: normalizeDate(raw?.createdAt ?? raw?.created_at) ?? new Date(),
    updatedAt: normalizeDate(raw?.updatedAt ?? raw?.updated_at) ?? new Date(),

    responseTimeMs: raw?.responseTimeMs ?? raw?.response_time_ms,
    uncertaintyMarkedDate: normalizeDate(raw?.uncertaintyMarkedDate ?? raw?.uncertainty_marked_date),
    completedDate: normalizeDate(raw?.completedDate ?? raw?.completed_date),

    tags: raw?.tags ?? [],
    reviewCount: raw?.reviewCount ?? raw?.review_count ?? 0,
    reviewLogs: normalizeReviewLogs(raw?.reviewLogs ?? raw?.review_logs ?? []),

    questionBlocks: (raw?.questionBlocks ?? raw?.question_blocks ?? [])
      .map(normalizeBlockOffsets)
      .filter((b: any) => {
        if (b.type === 'math' && !b.math?.latex?.trim()) return false;
        return true;
      }),
    answerBlocks: (raw?.answerBlocks ?? raw?.answer_blocks ?? [])
      .map(normalizeBlockOffsets)
      .filter((b: any) => {
        if (b.type === 'math' && !b.math?.latex?.trim()) return false;
        return true;
      }),
    layoutRows: normalizeLayoutRows(raw?.layoutRows ?? raw?.layout_rows ?? migratedLayoutRows),
    // Legacy互換の読み取り専用。高さロジックは layoutRows のみを参照する。
    questionExtraRows: legacyQuestionExtraRows,
    answerExtraRows: legacyAnswerExtraRows,
    inkQuestion: (() => {
      const doc = normalizeInkDocument(raw?.inkQuestion ?? raw?.ink_question ?? null);
      return doc.strokes.length > 0 ? doc : null;
    })(),
    inkAnswer: (() => {
      const doc = normalizeInkDocument(raw?.inkAnswer ?? raw?.ink_answer ?? null);
      return doc.strokes.length > 0 ? doc : null;
    })(),

    _rescueRaw: raw?._rescueRaw ?? undefined,
  };

  // ブロックが空で、レガシーフィールドにデータがある場合に自動変換を行う
  if (normalized.questionBlocks.length === 0) {
    const blocks: any[] = [];
    let idx = 0;
    if (normalized.questionText) blocks.push({ id: `q-text-${id}`, type: 'text', content: normalized.questionText, orderIndex: idx++ });
    if (normalized.questionCode) blocks.push({ id: `q-code-${id}`, type: 'code', code: normalized.questionCode, orderIndex: idx++ });
    if (normalized.questionImages.length > 0) blocks.push({ id: `q-img-${id}`, type: 'image', images: normalized.questionImages, orderIndex: idx++ });
    if (normalized.questionAudios.length > 0) blocks.push({ id: `q-audio-${id}`, type: 'audio', audios: normalized.questionAudios, orderIndex: idx++ });
    normalized.questionBlocks = blocks;
  }

  if (normalized.answerBlocks.length === 0) {
    const blocks: any[] = [];
    let idx = 0;
    if (normalized.answerText) blocks.push({ id: `a-text-${id}`, type: 'text', content: normalized.answerText, orderIndex: idx++ });
    if (normalized.answerCode) blocks.push({ id: `a-code-${id}`, type: 'code', code: normalized.answerCode, orderIndex: idx++ });
    if (normalized.answerImages.length > 0) blocks.push({ id: `a-img-${id}`, type: 'image', images: normalized.answerImages, orderIndex: idx++ });
    if (normalized.answerAudios.length > 0) blocks.push({ id: `a-audio-${id}`, type: 'audio', audios: normalized.answerAudios, orderIndex: idx++ });
    normalized.answerBlocks = blocks;
  }

  // 逆にブロックはあるがレガシーフィールドが空の場合（ブロックエディタでの保存後など）
  if (!normalized.questionText && normalized.questionBlocks.length > 0) {
    normalized.questionText = extractTextFromBlocks(normalized.questionBlocks);
  }
  if (!normalized.answerText && normalized.answerBlocks.length > 0) {
    normalized.answerText = extractTextFromBlocks(normalized.answerBlocks);
  }

  return normalized;
};

/**
 * フォルダデータを正規化する関数
 * snake_case / camelCase の差異を吸収し、削除状態を一貫して処理する
 */
export const normalizeFolder = (raw: any) => {
  const id = raw?.id ?? raw?.folderId ?? raw?.folder_id ?? makeFallbackId();
  const isDeleted = raw?.isDeleted ?? raw?.is_deleted ?? false;

  // deletedAt: isDeleted=true なのに deletedAt がない場合は updatedAt で補完
  const rawDeletedAt = raw?.deletedAt ?? raw?.deleted_at;
  let deletedAt: Date | null = null;
  if (rawDeletedAt) {
    deletedAt = normalizeDate(rawDeletedAt);
  } else if (isDeleted) {
    // isDeleted=true だが deletedAt がない → updatedAt で推定補完
    deletedAt = normalizeDate(raw?.updatedAt ?? raw?.updated_at ?? raw?.createdAt ?? raw?.created_at) ?? new Date(0);
  }

  return {
    id,
    folderId: id,
    userId: raw?.userId ?? raw?.user_id ?? '',
    deviceId: raw?.deviceId ?? raw?.device_id ?? '',
    parentFolderId: raw?.parentFolderId ?? raw?.parent_folder_id ?? null,
    folderName: raw?.folderName ?? raw?.folder_name ?? '',
    folderColor: raw?.folderColor ?? raw?.folder_color ?? null,
    orderIndex: raw?.orderIndex ?? raw?.order_index ?? 0,
    cloudSyncEnabled: raw?.cloudSyncEnabled ?? raw?.cloud_sync_enabled ?? true,
    isDeleted,
    deletedAt,
    isHidden: raw?.isHidden ?? raw?.is_hidden ?? false,
    isSilent: raw?.isSilent ?? raw?.is_silent ?? false,
    notePdfs: raw?.notePdfs ?? raw?.note_pdfs ?? [],
    lastAccessAt: normalizeDate(raw?.lastAccessAt ?? raw?.last_access_at),
    createdAt: normalizeDate(raw?.createdAt ?? raw?.created_at) ?? new Date(),
    updatedAt: normalizeDate(raw?.updatedAt ?? raw?.updated_at) ?? new Date(),
  };
};
