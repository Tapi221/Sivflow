export const foldersPathSegments = (userId: string): string[] => {
  if (!userId) {
    throw new Error("userId is required for foldersPath");
  }

  return ["users", userId, "folders"];
};

export const folderDocPathSegments = (
  userId: string,
  folderId: string,
): string[] => {
  if (!userId) {
    throw new Error("userId is required for folderDocPath");
  }

  if (!folderId) {
    throw new Error("folderId is required for folderDocPath");
  }

  return ["users", userId, "folders", folderId];
};

export const cardsPathSegments = (userId: string): string[] => {
  if (!userId) {
    throw new Error("userId is required for cardsPath");
  }

  return ["users", userId, "cards"];
};

export const cardDocPathSegments = (
  userId: string,
  cardId: string,
): string[] => {
  if (!userId) {
    throw new Error("userId is required for cardDocPath");
  }

  if (!cardId) {
    throw new Error("cardId is required for cardDocPath");
  }

  return ["users", userId, "cards", cardId];
};

export const imageDocPathSegments = (
  userId: string,
  imageId: string,
): string[] => {
  if (!userId) {
    throw new Error("userId is required for imageDocPath");
  }

  if (!imageId) {
    throw new Error("imageId is required for imageDocPath");
  }

  return ["users", userId, "images", imageId];
};
