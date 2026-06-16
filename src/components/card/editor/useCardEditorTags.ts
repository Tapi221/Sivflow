import { useMemo } from "react";
import type { TagColorKey } from "@shared/design-tokens/color/Color.Tag";
import { TAG_COLOR_KEYS } from "@shared/design-tokens/color/Color.Tag";
import { getTagColorKey as normalizeTagColorKey } from "@web-renderer/chip/budge/tag/tagColor";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { getLocalDb } from "@/services/localdb";
import type { TagRecord } from "@/services/localdb/types";



type Tag = TagRecord;
type UseCardEditorTagsResult = {
  tags: Tag[];
  tagById: Map<string, Tag>;
  addTag: (name: string) => Promise<Tag>;
};
type TagWriteCapableDb = Awaited<ReturnType<typeof getLocalDb>> & {
  addItem: (table: "tagRecords", item: Record<string, unknown>) => Promise<string>;
  updateItem: (table: "tagRecords", id: string, changes: Record<string, unknown>) => Promise<number>;
};



const DEFAULT_TAG_COLOR_KEY: TagColorKey = TAG_COLOR_KEYS[0];



const genId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};
const useCardEditorTags = (): UseCardEditorTagsResult => {
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
    if (!currentUser) throw new Error("login required");
    const db = (await getLocalDb(currentUser.uid)) as TagWriteCapableDb;
    const nameLower = name.toLowerCase();
    const existingCandidates = await db.tagRecords.where("[userId+nameLower]").equals([currentUser.uid, nameLower]).toArray();
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
        await db.updateItem("tagRecords", existing.id, patch as Record<string, unknown>);
        return { ...existing, ...patch, color: normalizeTagColorKey(existing.color) };
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
    await db.addItem("tagRecords", newTag as unknown as Record<string, unknown>);
    return newTag;
  };
  return {
    tags,
    tagById,
    addTag,
  };
};



export { useCardEditorTags };
