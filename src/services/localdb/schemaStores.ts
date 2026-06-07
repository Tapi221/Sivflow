type StoreSchema = Record<string, string | null>;

const joinIndexes = (indexes: string[]): string => indexes.join(", ");

export const LOCAL_DB_STORES: StoreSchema = {
  folders: joinIndexes(["id", "userId", "parentFolderId", "updatedAt", "cloudSyncEnabled", "isDeleted", "[userId+updatedAt]", "[userId+isDeleted]"]),
  cardSets: joinIndexes(["id", "userId", "folderId", "updatedAt", "isDeleted", "[userId+updatedAt]", "[userId+folderId]"]),
  cards: joinIndexes(["id", "userId", "folderId", "cardSetId", "