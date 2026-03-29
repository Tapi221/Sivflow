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
  if (!userId) throw new Error("userId is required for foldersPath");
  return ["users", userId, "folders"];
};

/**
 * ユーザーの特定フォルダDocumentパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @param folderId - フォルダID
 * @returns ["users", userId, "folders", folderId]
 */
export const folderDocPathSegments = (
  userId: string,
  folderId: string,
): string[] => {
  if (!userId) throw new Error("userId is required for folderDocPath");
  if (!folderId) throw new Error("folderId is required for folderDocPath");
  return ["users", userId, "folders", folderId];
};

/**
 * ユーザーのカードコレクションパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @returns ["users", userId, "cards"]
 */
export const cardsPathSegments = (userId: string): string[] => {
  if (!userId) throw new Error("userId is required for cardsPath");
  return ["users", userId, "cards"];
};

/**
 * ユーザーの特定カードDocumentパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @param cardId - カードID
 * @returns ["users", userId, "cards", cardId]
 */
export const cardDocPathSegments = (
  userId: string,
  cardId: string,
): string[] => {
  if (!userId) throw new Error("userId is required for cardDocPath");
  if (!cardId) throw new Error("cardId is required for cardDocPath");
  return ["users", userId, "cards", cardId];
};
/**
 * ユーザーの特定画像メタデータDocumentパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @param imageId - 画像ID
 * @returns ["users", userId, "images", imageId]
 */
export const imageDocPathSegments = (
  userId: string,
  imageId: string,
): string[] => {
  if (!userId) throw new Error("userId is required for imageDocPath");
  if (!imageId) throw new Error("imageId is required for imageDocPath");
  return ["users", userId, "images", imageId];
};
/**
 * ユーザーの特定PPTX変換ジョブDocumentパスを生成（セグメント配列）
 * @param userId - ユーザーID
 * @param documentId - ドキュメントID
 * @returns ["users", userId, "pptxConversions", documentId]
 */
export const pptxConversionDocPathSegments = (
  userId: string,
  documentId: string,
): string[] => {
  if (!userId) throw new Error("userId is required for pptxConversionDocPath");
  if (!documentId)
    throw new Error("documentId is required for pptxConversionDocPath");
  return ["users", userId, "pptxConversions", documentId];
};




