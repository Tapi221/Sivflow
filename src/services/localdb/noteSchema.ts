import type { LocalDB } from "./LocalDB";

type LocalDBStores = Record<string, string | null>;

const CURRENT_LOCAL_DB_STORES: LocalDBStores = {
  folders:
    "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
  cardSets:
    "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
  cards:
    "id, userId, folderId, cardSetId, updatedAt, next