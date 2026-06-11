const AUX_STORES = { tagRecords: "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt", studyLogs: "id, userId, cardId, studiedAt", metadata: "key", images: "id, userId, status, [userId+status]", cardRelations: "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]", projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]", documentFiles: "id, updatedAt", tags: null, tags_v2: null, tags_v3: null };



export { AUX_STORES };
