const foldersPathSegments = (userId: string): [string, string, string] => {
  if (!userId) {
    throw new Error("userId is required for foldersPath");
  }

  return ["users", userId, "folders"];
};
const folderDocPathSegments = (userId: string, folderId: string): [string, string, string, string] => {
  if (!userId) {
    throw new Error("userId is required for folderDocPath");
  }

  if (!folderId) {
    throw new Error("folderId is required for folderDocPath");
  }

  return ["users", userId, "folders", folderId];
};
const cardsPathSegments = (userId: string): [string, string, string] => {
  if (!userId) {
    throw new Error("userId is required for cardsPath");
  }

  return ["users", userId, "cards"];
};
const cardDocPathSegments = (userId: string, cardId: string): [string, string, string, string] => {
  if (!userId) {
    throw new Error("userId is required for cardDocPath");
  }

  if (!cardId) {
    throw new Error("cardId is required for cardDocPath");
  }

  return ["users", userId, "cards", cardId];
};
const imageDocPathSegments = (userId: string, imageId: string): [string, string, string, string] => {
  if (!userId) {
    throw new Error("userId is required for imageDocPath");
  }

  if (!imageId) {
    throw new Error("imageId is required for imageDocPath");
  }

  return ["users", userId, "images", imageId];
};
const storageStatsDocPathSegments = (userId: string, docId: string = "current"): [string, string, string, string] => {
  if (!userId) {
    throw new Error("userId is required for storageStatsDocPath");
  }

  if (!docId) {
    throw new Error("docId is required for storageStatsDocPath");
  }

  return ["users", userId, "storageStats", docId];
};



export { foldersPathSegments, folderDocPathSegments, cardsPathSegments, cardDocPathSegments, imageDocPathSegments, storageStatsDocPathSegments };
