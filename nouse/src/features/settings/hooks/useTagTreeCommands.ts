import { useCallback } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { getLocalDb } from "@/services/localdb";
import type { TagRecord } from "@/services/localdb/types";



type TagTreePositionPatch = {
  parentId: string | null;
  orderIndex: number;
};
type TagUpdateCapableDb = Awaited<ReturnType<typeof getLocalDb>> & {
  updateItem: (table: "tagRecords", id: string, changes: Record<string, unknown>) => Promise<number>;
};



const getNormalizedParentId = (parentId: string | null): string | undefined => typeof parentId === "string" && parentId.trim().length > 0 ? parentId : undefined;
const isTagAncestorOf = (sourceId: string, candidateParentId: string | undefined, tagById: ReadonlyMap<string, TagRecord>): boolean => {
  let currentParentId = candidateParentId;
  const visited = new Set<string>();

  while (currentParentId) {
    if (currentParentId === sourceId) return true;
    if (visited.has(currentParentId)) return true;
    visited.add(currentParentId);
    currentParentId = tagById.get(currentParentId)?.parentId;
  }

  return false;
};
const useTagTreeCommands = (tagById: ReadonlyMap<string, TagRecord>) => {
  const { currentUser } = useAuthSession();

  const setTagTreePosition = useCallback(async (tagId: string, patch: TagTreePositionPatch): Promise<void> => {
    if (!currentUser) return;

    const tag = tagById.get(tagId);
    if (!tag) return;

    const normalizedParentId = getNormalizedParentId(patch.parentId);
    if (normalizedParentId === tagId) return;
    if (normalizedParentId && !tagById.has(normalizedParentId)) return;
    if (isTagAncestorOf(tagId, normalizedParentId, tagById)) return;

    const db = (await getLocalDb(currentUser.uid)) as TagUpdateCapableDb;
    await db.updateItem("tagRecords", tagId, { parentId: normalizedParentId, orderIndex: patch.orderIndex, updatedAt: new Date() });
  }, [currentUser, tagById]);

  return { setTagTreePosition };
};



export { useTagTreeCommands };
