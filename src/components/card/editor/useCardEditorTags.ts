import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getTagColorKey as normalizeTagColorKey, TAG_COLOR_KEYS, type TagColorKey } from "@/chip/tag/tagColor";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { TagRecord } from "@/services/localdb/types";

type Tag = TagRecord;

type UseCardEditorTagsResult = {
  tags: Tag[];
  tagById: Map<string, Tag>;
  addTag: (name: string) => Promise<Tag>;
};

const DEFAULT_TAG_COLOR_KEY: TagColorKey = TAG_COLOR_KEYS[0];

const genId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const useCardEditorTags = (): UseCardEditorTagsResult => {
  const { currentUser } = useAuthSession();

  const rawTags = useLiveQuery(
    async () => {
      if (!currentUser) return [] as Tag[];
      const db = await getLocalDb(currentUser.uid);
      return db.tagRecords.where("userId").equals(currentUser.uid).toArray();
    },
    [currentUser],
    [] as Tag[],
  );

  const tags = (rawTags ?? [])
    .filter((tag) => !tag.isDeleted)
    .map((tag) => ({
      ...tag,
      color: normalizeTagColorKey(tag.color),
    }));

  const tagById = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const tag of tags) map.set(tag.id, tag);
    return map;
  }, [tags]);

  const addTag = async (name: string): Promise<Tag> => {
    if (!currentUser) throw new Error("not authenticated");

    const db = await getLocalDb(currentUser.uid);
    const nameLower = name.toLowerCase();
    const existingCandidates = await db.tagRecords
      .where("[userId+nameLower]")
      .equals([currentUser.uid, nameLower])
      .toArray();

    const existing = existingCandidates.slice().sort((left, right) => {
      if (Boolean(left.isDeleted) !== Boolean(right.isDeleted)) {
        return Number(Boolean(left.isDeleted)) - Number(Boolean(right.isDeleted));
      }
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })[0];

    if (existing) {
      if (existing.isDeleted) {
        const patch: Partial<Tag> = {
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        };
        await db.tagRecords.update(existing.id, patch);
        const revived = { ...existing, ...patch, color: normalizeTagColorKey(existing.color) };
        await db.queueUpsertSync({
          entity: "tag",
          operationType: "update",
          payload: revived,
        });
        return revived;
      }

      return {
        ...existing,
        color: normalizeTagColorKey(existing.color),
      };
    }

    const now = new Date();
    const newTag: Tag = {
      id: genId(),
      name,
      nameLower,
      color: DEFAULT_TAG_COLOR_KEY,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    };

    await db.tagRecords.add(newTag);
    await db.queueUpsertSync({
      entity: "tag",
      operationType: "create",
      payload: newTag,
    });
    return newTag;
  };

  return {
    tags,
    tagById,
    addTag,
  };
};
