import type { LocalDB } from "./LocalDB";

const LOCAL_DB_STORES = {
  folders: "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
  cardSets: "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
  cards: "id, userId, folderId, cardSetId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [