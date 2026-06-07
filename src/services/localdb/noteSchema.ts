import type { LocalDB } from "./LocalDB";

export const defineNoteSchema = (db: LocalDB): void => {
  db.version(33).stores({
    notes: "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
  });

  db.version(34)
    .stores({
      tags: null,
      tags_v2: null,
      tags_v3: null,
    })
    .upgrade(async (tx) => {
      await tx.table("metadata").put({
        key: "schemaCompaction.v34.completed",
        completedAt: new Date(),
      });
    });
};