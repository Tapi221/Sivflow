import { useCallback } from "react";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { TagRecord } from "@/services/localdb/types";

type TagTreePositionPatch = {
  parentId: string | null;
  orderIndex: number;
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

const queueTagUpsert = async (db: Awaited<ReturnType<typeof getLocalDb>>, tagId: string): Promise<void> => {
  const tag = await db.tagRecords.get(tagId);
  if (!tag) return;

  await db.queueUpsertSync({ entity: "tag", operationType: "update", payload: tag });
};

export const useTagTreeCommands = (tagById: ReadonlyMap<string, TagRecord>) => {
  const { currentUser } = useAuthSession();

  const setTagTreePosition = useCallback(async (tagId: string, patch: TagTreePositionPatch): Promise<void | { error: string }> => {
    if (!currentUser) return { error: "ログイン状態を確認してください。" };

    const tag = tagById.get(tagId);
    if (!tag) return { error: "対象のタグが見つかりません。" };

    const normalizedParentId = getNormalizedParentId(patch.parentId);
    if (normalizedParentId === tagId) return { error: "自分自身を親にはできません。" };
    if (normalizedParentId && !tagById.has(normalizedParentId)) return { error: "親タグが見つかりません。" };
    if (isTagAncestorOf(tagId, normalizedParentId, tagById)) return { error: "循環は禁止です。" };

    const db = await getLocalDb(currentUser.uid);
    await db.tagRecords.update(tagId, { parentId: normalizedParentId, orderIndex: patch.orderIndex, updatedAt: new Date() });
    await queueTagUpsert(db, tagId);
  }, [currentUser, tagById]);

  return { setTagTreePosition };
};
