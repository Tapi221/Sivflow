import { normalizeUploadedImages } from './imageUtils';
import { normalizeMemoryStability } from './reviewUtils';

// ページ名から URL パスを作成
// クエリパラメータ付きの場合も対応（例: 'CardEdit?folderId=xxx'）
export const createPageUrl = (pageName: string): string => {
  const mapping: { [key: string]: string } = {
    'Dashboard': '/',
    'Folders': '/folders',
    'FolderView': '/FolderView',
    'CardEdit': '/CardEdit',
    'CardView': '/CardView',
    'StudyMode': '/study',
    'UncertainMode': '/uncertain',
    'Calendar': '/calendar',
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

const normalizeDate = (value: any) => {
  if (value === null || value === undefined) return null;
  // Firestore Timestamp
  if (typeof value?.toDate === 'function') return value.toDate();
  // Already a Date
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  // Numeric epoch milliseconds/seconds
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  // ISO/date string
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  // Fallback: unknown type → null（無効な時間値回避）
  return null;
};

export const extractTextFromBlocks = (blocks: any[]): string => {
  if (!blocks || !Array.isArray(blocks)) return '';
  // 最初に見つかった非空のテキスト系コンテンツを返す
  for (const block of blocks) {
    if (block.type === 'text' && block.content) return block.content.trim();
    if (block.type === 'memo' && block.content) return block.content.trim();
    if (block.type === 'code' && block.code?.code) return block.code.code.split('\n')[0].trim();
  }
  return '';
};

export const normalizeCard = (raw: any) => {
  const id = raw?.id ?? raw?.cardId ?? raw?.card_id;

  const normalized = {
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
    questionMemo: raw?.questionMemo ?? raw?.question_memo ?? '',
    questionMarked: raw?.questionMarked ?? raw?.question_marked ?? '',
    answerText: raw?.answerText ?? raw?.answer_text ?? 
                raw?.back ?? raw?.answer ?? raw?.a ??
                raw?.fields?.Back ?? raw?.fields?.Answer ?? '',
    answerImages: normalizeUploadedImages(raw?.answerImages ?? raw?.answer_images ?? []),
    answerAudios: raw?.answerAudios ?? raw?.answer_audios ?? [],
    answerCode: raw?.answerCode ?? raw?.answer_code ?? null,
    answerTextHighlighted: raw?.answerTextHighlighted ?? '',
    answerMemo: raw?.answerMemo ?? raw?.answer_memo ?? '',
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
    questionBlocks: raw?.questionBlocks ?? raw?.question_blocks ?? [],
    answerBlocks: raw?.answerBlocks ?? raw?.answer_blocks ?? [],
    _rescueRaw: raw?._rescueRaw ?? undefined,
  };

  // ブロックが空で、レガシーフィールドにデータがある場合に自動変換を行う
  if (normalized.questionBlocks.length === 0) {
    const blocks = [];
    let idx = 0;
    if (normalized.questionText) blocks.push({ id: `q-text-${id}`, type: 'text', content: normalized.questionText, orderIndex: idx++ });
    if (normalized.questionCode) blocks.push({ id: `q-code-${id}`, type: 'code', code: normalized.questionCode, orderIndex: idx++ });
    if (normalized.questionImages.length > 0) blocks.push({ id: `q-img-${id}`, type: 'image', images: normalized.questionImages, orderIndex: idx++ });
    if (normalized.questionAudios.length > 0) blocks.push({ id: `q-audio-${id}`, type: 'audio', audios: normalized.questionAudios, orderIndex: idx++ });
    if (normalized.questionMemo) blocks.push({ id: `q-memo-${id}`, type: 'memo', content: normalized.questionMemo, orderIndex: idx++ });
    normalized.questionBlocks = blocks;
  }

  if (normalized.answerBlocks.length === 0) {
    const blocks = [];
    let idx = 0;
    if (normalized.answerText) blocks.push({ id: `a-text-${id}`, type: 'text', content: normalized.answerText, orderIndex: idx++ });
    if (normalized.answerCode) blocks.push({ id: `a-code-${id}`, type: 'code', code: normalized.answerCode, orderIndex: idx++ });
    if (normalized.answerImages.length > 0) blocks.push({ id: `a-img-${id}`, type: 'image', images: normalized.answerImages, orderIndex: idx++ });
    if (normalized.answerAudios.length > 0) blocks.push({ id: `a-audio-${id}`, type: 'audio', audios: normalized.answerAudios, orderIndex: idx++ });
    if (normalized.answerMemo) blocks.push({ id: `a-memo-${id}`, type: 'memo', content: normalized.answerMemo, orderIndex: idx++ });
    normalized.answerBlocks = blocks;
  }

  // 逆にブロックはあるがレガシーフィールドが空の場合（ブロックエディタでの保存後など）
  if (!normalized.questionText && normalized.questionBlocks.length > 0) {
    normalized.questionText = extractTextFromBlocks(normalized.questionBlocks);
  }
  if (!normalized.answerText && normalized.answerBlocks.length > 0) {
    normalized.answerText = extractTextFromBlocks(normalized.answerBlocks);
  }

  // タイトルが空の場合のフォールバック
  if (!normalized.title) {
    const preview = normalized.questionText.trim();
    if (preview) {
      normalized.title = preview.length > 20 ? preview.substring(0, 20) + '...' : preview;
    } else {
      normalized.title = '無題のカード';
    }
  }

  return normalized;
};

/**
 * フォルダデータを正規化する関数
 * snake_case / camelCase の差異を吸収し、削除状態を一貫して処理する
 */
export const normalizeFolder = (raw: any) => {
  const id = raw?.id ?? raw?.folderId ?? raw?.folder_id;
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
    memoText: raw?.memoText ?? raw?.memo_text ?? '',
    memoImages: normalizeUploadedImages(raw?.memoImages ?? raw?.memo_images ?? []),
    notePdfs: raw?.notePdfs ?? raw?.note_pdfs ?? [],
    createdAt: normalizeDate(raw?.createdAt ?? raw?.created_at) ?? new Date(),
    updatedAt: normalizeDate(raw?.updatedAt ?? raw?.updated_at) ?? new Date(),
  };
};
