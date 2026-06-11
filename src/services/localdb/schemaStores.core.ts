const CORE_STORES = { folders: "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]", documents: "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]", notes: "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]", users: "id, userId, updatedAt", userSettings: "id, userId, updatedAt, isDeleted, [userId+updatedAt]", userStats: "id, userId, updatedAt, isDeleted, [userId+updatedAt]" };



export { CORE_STORES };
