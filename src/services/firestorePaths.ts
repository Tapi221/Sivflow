/**
 * Firestore パス生成ヘルパー
 * 
 * すべてのFirestoreコレクション/ドキュメントパスを統一的に管理。
 * /users/{userId}/ サブコレクション構造に基づいたセグメント配列を生成。
 */

/**
 * ユーザーのフォルダコレクションパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @returns ["users", userId, "folders"]
 */
export const foldersPathSegments = (userId: string): string[] => {
  if (!userId) throw new Error('userId is required for foldersPath');
  return ['users', userId, 'folders'];
};

/**
 * ユーザーの特定フォルダDocumentパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @param folderId - フォルダID
 * @returns ["users", userId, "folders", folderId]
 */
export const folderDocPathSegments = (userId: string, folderId: string): string[] => {
  if (!userId) throw new Error('userId is required for folderDocPath');
  if (!folderId) throw new Error('folderId is required for folderDocPath');
  return ['users', userId, 'folders', folderId];
};

/**
 * ユーザーのカードコレクションパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @returns ["users", userId, "cards"]
 */
export const cardsPathSegments = (userId: string): string[] => {
  if (!userId) throw new Error('userId is required for cardsPath');
  return ['users', userId, 'cards'];
};

/**
 * ユーザーの特定カードDocumentパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @param cardId - カードID
 * @returns ["users", userId, "cards", cardId]
 */
export const cardDocPathSegments = (userId: string, cardId: string): string[] => {
  if (!userId) throw new Error('userId is required for cardDocPath');
  if (!cardId) throw new Error('cardId is required for cardDocPath');
  return ['users', userId, 'cards', cardId];
};

/**
 * ユーザーのカードリレーションコレクションパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @returns ["users", userId, "cardRelations"]
 */
export const cardRelationsPathSegments = (userId: string): string[] => {
  if (!userId) throw new Error('userId is required for cardRelationsPath');
  return ['users', userId, 'cardRelations'];
};

/**
 * ユーザーのプロジェクトマップコレクションパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @returns ["users", userId, "projectMaps"]
 */
export const projectMapsPathSegments = (userId: string): string[] => {
  if (!userId) throw new Error('userId is required for projectMapsPath');
  return ['users', userId, 'projectMaps'];
};

/**
 * ユーザーのアップロードファイルコレクションパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @returns ["users", userId, "uploads"]
 */
export const uploadsPathSegments = (userId: string): string[] => {
  if (!userId) throw new Error('userId is required for uploadsPath');
  return ['users', userId, 'uploads'];
};

/**
 * ユーザーの特定アップロードファイルDocumentパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @param uploadId - アップロードID
 * @returns ["users", userId, "uploads", uploadId]
 */
export const uploadDocPathSegments = (userId: string, uploadId: string): string[] => {
  if (!userId) throw new Error('userId is required for uploadDocPath');
  if (!uploadId) throw new Error('uploadId is required for uploadDocPath');
  return ['users', userId, 'uploads', uploadId];
};

/**
 * ユーザーのセキュリティログコレクションパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @returns ["users", userId, "securityLogs"]
 */
export const securityLogsPathSegments = (userId: string): string[] => {
  if (!userId) throw new Error('userId is required for securityLogsPath');
  return ['users', userId, 'securityLogs'];
};
