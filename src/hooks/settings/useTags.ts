import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDb } from "@/services/localDB";
import { useAuthSession } from "@/contexts/AuthContext";
import type { TagV3Record } from "@/services/localdb/types";
import { useUserSettings } from "./useUserSettings";
import {
  getTagColorClassName as resolveTagColorClassName,
  getTagColorKey as normalizeTagColorKey,
  TAG_COLOR_KEYS,
  type TagColorKey,
} from "@/lib/tags/tagColor";

export type TagCategory = string;
export type Tag = TagV3Record;

type CardTagFields = {
  userId?: string;
  tagIds?: unknown;
  updatedAt?: Date;
};

export const DEFAULT_TAG_COLOR_KEYS: TagColorKey[] = [...TAG_COLOR_KEYS];

const genId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const genCategoryId = (): string => `cat_${genId()}`;

const MAX_PATH_DEPTH = 12;

const parseTagPath = (pathStr: string): string[] | { error: string } => {
  const segments = pathStr
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (segments.length === 0) return { error: "パスを入力してください。" };
  if (segments.length > MAX_PATH_DEPTH) {
    return { error: `パスの深さは最大 ${MAX_PATH_DEPTH} です。` };
  }

  return segments;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const getCardTagIds = (card: Pick<CardTagFields, "tagIds">): string[] =>
  asStringArray(card.tagIds);

type TagRepairSummary = {
  removedOrphanTagRefs: number;
  dedupedTagRefs: number;
  duplicateNameLowerPairs: Array<{
    userId: string;
    nameLower: string;
    tagIds: string[];
  }>;
};

export const resolveCardTagNames = (
  tagIds: unknown,
  tagById: ReadonlyMap<string, Pick<TagV3Record, "name">>,
): string[] => {
  const ids = asStringArray(tagIds);
  if (ids.length === 0) return [];
  return ids.map((id) => tagById.get(id)?.name ?? "").filter((name) => name);
};

export const auditAndRepairTags = async (
  userId: string,
): Promise<TagRepairSummary> => {
  const db = await getLocalDb(userId);
  const tagIdsByNameLower = new Map<string, string[]>();
  const knownTagIds = new Set<string>();
  let removedOrphanTagRefs = 0;
  let dedupedTagRefs = 0;

  await db.transaction("rw", db.tags_v3, db.cards, async () => {
    await db.tags_v3
      .where("userId")
      .equals(userId)
      .each((raw: unknown) => {
        const tag = raw as {
          id?: unknown;
          userId?: unknown;
          nameLower?: unknown;
        };

        if (
          typeof tag.id !== "string" ||
          typeof tag.userId !== "string" ||
          typeof tag.nameLower !== "string"
        ) {
          return;
        }

        knownTagIds.add(tag.id);

        const key = `${tag.userId}__${tag.nameLower}`;
        const existing = tagIdsByNameLower.get(key);
        if (existing) existing.push(tag.id);
        else tagIdsByNameLower.set(key, [tag.id]);
      });

    await db.cards
      .where("userId")
      .equals(userId)
      .modify((raw: unknown) => {
        const card = raw as Record<string, unknown> & CardTagFields;
        const currentTagIds = asStringArray(card.tagIds);
        if (currentTagIds.length === 0) return;

        const seen = new Set<string>();
        const nextTagIds: string[] = [];
        let changed = false;

        for (const tagId of currentTagIds) {
          if (!knownTagIds.has(tagId)) {
            removedOrphanTagRefs += 1;
            changed = true;
            continue;
          }

          if (seen.has(tagId)) {
            dedupedTagRefs += 1;
            changed = true;
            continue;
          }

          seen.add(tagId);
          nextTagIds.push(tagId);
        }

        if (!changed) return;

        card.tagIds = nextTagIds;
        card.updatedAt = new Date();
      });
  });

  const duplicateNameLowerPairs: Array<{
    userId: string;
    nameLower: string;
    tagIds: string[];
  }> = [];

  for (const [key, tagIds] of tagIdsByNameLower.entries()) {
    if (tagIds.length < 2) continue;
    const separatorIndex = key.indexOf("__");
    duplicateNameLowerPairs.push({
      userId: key.slice(0, separatorIndex),
      nameLower: key.slice(separatorIndex + 2),
      tagIds,
    });
  }

  return { removedOrphanTagRefs, dedupedTagRefs, duplicateNameLowerPairs };
};

export const useTags = () => {
  const { currentUser } = useAuthSession();
  const { settings, updateSettings } = useUserSettings();

  const rawTags = useLiveQuery(
    async () => {
      if (!currentUser) return [] as Tag[];
      const db = await getLocalDb(currentUser.uid);
      return db.tags_v3.where("userId").equals(currentUser.uid).toArray();
    },
    [currentUser],
    [] as Tag[],
  );

  const tags = (rawTags ?? []).map((tag) => ({
    ...tag,
    color: normalizeTagColorKey(tag.color),
  }));

  const tagByName = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const tag of tags) map.set(tag.name, tag);
    return map;
  }, [tags]);

  const tagByNameLower = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const tag of tags) map.set(tag.nameLower, tag);
    return map;
  }, [tags]);

  const tagById = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const tag of tags) map.set(tag.id, tag);
    return map;
  }, [tags]);

  const getTagChildrenMap = (): Map<string | null, Tag[]> => {
    const childrenMap = new Map<string | null, Tag[]>();

    for (const tag of tags) {
      const parentId =
        typeof tag.parentId === "string" && tagById.has(tag.parentId)
          ? tag.parentId
          : null;

      const siblings = childrenMap.get(parentId) ?? [];
      siblings.push(tag);
      childrenMap.set(parentId, siblings);
    }

    return childrenMap;
  };

  const categoryNameMap = useMemo(
    () => settings?.tagCategoryDisplayNames ?? {},
    [settings?.tagCategoryDisplayNames],
  );

  const categoryIdsInUse = useMemo(() => {
    const ids = new Set<string>();

    for (const tag of tags) {
      if (typeof tag.categoryId === "string" && tag.categoryId.trim()) {
        ids.add(tag.categoryId);
      }
    }

    return Array.from(ids).sort((left, right) => {
      const leftName = (categoryNameMap[left] ?? left).trim();
      const rightName = (categoryNameMap[right] ?? right).trim();
      return leftName.localeCompare(rightName, "ja");
    });
  }, [categoryNameMap, tags]);

  const resolveTagByNameOrId = (tagNameOrId: string): Tag | undefined =>
    tagByName.get(tagNameOrId) ??
    tagByNameLower.get(tagNameOrId.toLowerCase()) ??
    tagById.get(tagNameOrId);

  const getTagColorKey = (tagNameOrId: string): TagColorKey => {
    const storedColor = resolveTagByNameOrId(tagNameOrId)?.color;
    return normalizeTagColorKey(storedColor);
  };

  const getTagColorClassName = (tagNameOrId: string): string =>
    resolveTagColorClassName(getTagColorKey(tagNameOrId));

  const getTagColor = (tagNameOrId: string): string =>
    getTagColorClassName(tagNameOrId);

  const getTagIdByName = (tagName: string): string | null =>
    (tagByName.get(tagName) ?? tagByNameLower.get(tagName.toLowerCase()))?.id ??
    null;

  const getTagNameById = (tagId: string): string | null =>
    tagById.get(tagId)?.name ?? null;

  const getCategoryName = (categoryId: string): string => {
    const displayName = categoryNameMap[categoryId];
    return typeof displayName === "string" && displayName.trim()
      ? displayName
      : categoryId;
  };

  const setCategoryName = async (
    categoryId: string,
    name: string,
  ): Promise<void> => {
    if (!currentUser) return;

    await updateSettings({
      tagCategoryDisplayNames: {
        ...categoryNameMap,
        [categoryId]: name,
      },
    });
  };

  const ensureCategory = async (displayName?: string): Promise<string> => {
    if (!currentUser) throw new Error("not authenticated");

    const categoryId = genCategoryId();
    const resolvedName = displayName?.trim() || "新しいカテゴリ";

    await setCategoryName(categoryId, resolvedName);

    return categoryId;
  };

  const setTagCategory = async (
    tagId: string,
    categoryId: string | null,
  ): Promise<void> => {
    if (!currentUser) return;

    const db = await getLocalDb(currentUser.uid);
    const nextCategoryId =
      typeof categoryId === "string" && categoryId.trim()
        ? categoryId
        : undefined;

    await db.transaction("rw", db.tags_v3, async () => {
      await db.tags_v3.update(tagId, {
        categoryId: nextCategoryId,
        updatedAt: new Date(),
      });
    });
  };

  const setTagParent = async (
    tagId: string,
    parentId: string | null,
  ): Promise<void | { error: string }> => {
    if (!currentUser) return { error: "ログイン状態を確認してください。" };

    const tag = tagById.get(tagId);
    if (!tag) return { error: "対象のタグが見つかりません。" };

    const normalizedParentId =
      typeof parentId === "string" && parentId.trim() ? parentId : undefined;

    if (normalizedParentId === tagId) {
      return { error: "自分自身を親にはできません。" };
    }

    if (normalizedParentId && !tagById.has(normalizedParentId)) {
      return { error: "親タグが見つかりません。" };
    }

    let currentParentId = normalizedParentId;
    while (currentParentId) {
      if (currentParentId === tagId) {
        return { error: "循環は禁止です。" };
      }
      currentParentId = tagById.get(currentParentId)?.parentId;
    }

    const db = await getLocalDb(currentUser.uid);
    await db.tags_v3.update(tagId, {
      parentId: normalizedParentId,
      updatedAt: new Date(),
    });
  };

  const listCategoryIdsInUse = (): string[] => categoryIdsInUse;

  const getTagUsageCount = async (nameOrId: string): Promise<number> => {
    if (!currentUser) return 0;

    const db = await getLocalDb(currentUser.uid);
    const tagId = tagById.has(nameOrId)
      ? nameOrId
      : (getTagIdByName(nameOrId) ?? null);

    if (!tagId) return 0;

    try {
      return await db.cards
        .where("tagIds")
        .equals(tagId)
        .and((card) => card.userId === currentUser.uid)
        .count();
    } catch {
      let count = 0;
      await db.cards
        .where("userId")
        .equals(currentUser.uid)
        .each((raw: unknown) => {
          const card = raw as CardTagFields;
          const idTags = asStringArray(card.tagIds);
          if (idTags.includes(tagId)) count += 1;
        });
      return count;
    }
  };

  const addTag = async (
    name: string,
    color: string = DEFAULT_TAG_COLOR_KEYS[0],
    categoryId?: TagCategory,
    parentId?: string,
  ): Promise<Tag> => {
    if (!currentUser) throw new Error("not authenticated");

    const db = await getLocalDb(currentUser.uid);
    const nameLower = name.toLowerCase();
    const normalizedColor = normalizeTagColorKey(color);

    const existing = await db.tags_v3
      .where("[userId+nameLower]")
      .equals([currentUser.uid, nameLower])
      .first();

    if (existing) {
      const patch: Partial<Tag> = {};

      if (existing.color !== normalizedColor) patch.color = normalizedColor;
      if (categoryId && existing.categoryId !== categoryId) {
        patch.categoryId = categoryId;
      }
      if (parentId && existing.parentId !== parentId) {
        patch.parentId = parentId;
      }

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = new Date();
        await db.tags_v3.update(existing.id, patch);
        return { ...existing, ...patch };
      }

      return existing;
    }

    const newTag: Tag = {
      id: genId(),
      name,
      nameLower,
      color: normalizedColor,
      userId: currentUser.uid,
      updatedAt: new Date(),
      ...(categoryId ? { categoryId } : {}),
      ...(parentId ? { parentId } : {}),
    };

    await db.tags_v3.add(newTag);
    return newTag;
  };

  const ensurePathExists = async (
    fullPath: string,
  ): Promise<{ leafTagId: string } | { error: string }> => {
    if (!currentUser) return { error: "ログイン状態を確認してください。" };

    const parsed = parseTagPath(fullPath);
    if ("error" in parsed) return parsed;

    const db = await getLocalDb(currentUser.uid);
    let parentId: string | undefined = undefined;
    let lastTagId = "";

    for (const segment of parsed) {
      const nameLower = segment.toLowerCase();
      const candidates = await db.tags_v3
        .where("[userId+nameLower]")
        .equals([currentUser.uid, nameLower])
        .toArray();

      const existing = candidates.find((tag) =>
        parentId === undefined ? !tag.parentId : tag.parentId === parentId,
      );

      if (existing) {
        lastTagId = existing.id;
        parentId = existing.id;
      } else {
        const newTag: Tag = {
          id: genId(),
          name: segment,
          nameLower,
          color: DEFAULT_TAG_COLOR_KEYS[0],
          userId: currentUser.uid,
          updatedAt: new Date(),
          ...(parentId ? { parentId } : {}),
        };

        await db.tags_v3.add(newTag);
        lastTagId = newTag.id;
        parentId = newTag.id;
      }
    }

    if (!lastTagId) return { error: "パスが解決できませんでした。" };
    return { leafTagId: lastTagId };
  };

  const moveSelectedTagToPath = async (
    tagId: string,
    parentPath: string,
  ): Promise<void | { error: string }> => {
    if (!currentUser) return { error: "ログイン状態を確認してください。" };

    const trimmed = parentPath.trim();
    if (!trimmed) {
      return setTagParent(tagId, null);
    }

    const parsed = parseTagPath(trimmed);
    if ("error" in parsed) return parsed;

    const db = await getLocalDb(currentUser.uid);
    const localMap = new Map<string, Pick<Tag, "parentId">>(tagById);
    let parentId: string | undefined = undefined;

    for (const segment of parsed) {
      const nameLower = segment.toLowerCase();
      const candidates = await db.tags_v3
        .where("[userId+nameLower]")
        .equals([currentUser.uid, nameLower])
        .toArray();

      const existing = candidates.find((tag) =>
        parentId === undefined ? !tag.parentId : tag.parentId === parentId,
      );

      if (existing) {
        localMap.set(existing.id, existing);
        parentId = existing.id;
      } else {
        const newTag: Tag = {
          id: genId(),
          name: segment,
          nameLower,
          color: DEFAULT_TAG_COLOR_KEYS[0],
          userId: currentUser.uid,
          updatedAt: new Date(),
          ...(parentId ? { parentId } : {}),
        };

        await db.tags_v3.add(newTag);
        localMap.set(newTag.id, newTag);
        parentId = newTag.id;
      }
    }

    const finalParentId = parentId;
    if (!finalParentId) return { error: "親パスが解決できませんでした。" };
    if (finalParentId === tagId) {
      return { error: "自分自身を親にはできません。" };
    }

    const visited = new Set<string>();
    let current: string | undefined = finalParentId;

    while (current) {
      if (visited.has(current)) break;
      if (current === tagId) return { error: "循環は禁止です。" };
      visited.add(current);
      current = localMap.get(current)?.parentId;
    }

    await db.tags_v3.update(tagId, {
      parentId: finalParentId,
      updatedAt: new Date(),
    });
  };

  const getTagPathString = (tagId: string): string => {
    const segments: string[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = tagId;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const tag = tagById.get(currentId);
      if (!tag) break;
      segments.unshift(tag.name);
      currentId = tag.parentId;
    }

    return segments.join("/");
  };

  const renameTag = async (
    tagId: string,
    newName: string,
  ): Promise<void | { error: string }> => {
    if (!currentUser) return { error: "ログイン状態を確認してください。" };

    const tag = tagById.get(tagId);
    if (!tag) return { error: "対象のタグが見つかりません。" };

    const trimmedName = newName.trim();
    if (!trimmedName) return { error: "タグ名を入力してください。" };

    const newNameLower = trimmedName.toLowerCase();
    const db = await getLocalDb(currentUser.uid);

    if (newNameLower !== tag.nameLower) {
      const existing = await db.tags_v3
        .where("[userId+nameLower]")
        .equals([currentUser.uid, newNameLower])
        .first();

      if (existing && existing.id !== tagId) {
        return { error: `「${trimmedName}」はすでに存在します。` };
      }
    }

    await db.tags_v3.update(tagId, {
      name: trimmedName,
      nameLower: newNameLower,
      updatedAt: new Date(),
    });
  };

  const mergeTags = async (
    fromTagId: string,
    intoTagId: string,
  ): Promise<{ updatedCards: number } | { error: string }> => {
    if (!currentUser) return { error: "ログイン状態を確認してください。" };
    if (fromTagId === intoTagId) {
      return { error: "統合元と統合先が同じです。" };
    }

    const db = await getLocalDb(currentUser.uid);
    const fromTag = tagById.get(fromTagId);
    const intoTag = tagById.get(intoTagId);

    if (!fromTag || !intoTag) {
      return { error: "統合対象のタグが見つかりません。" };
    }

    let updatedCards = 0;

    await db.transaction("rw", db.tags_v3, db.cards, async () => {
      await db.cards
        .where("userId")
        .equals(currentUser.uid)
        .modify((raw: unknown) => {
          const card = raw as Record<string, unknown> & CardTagFields;
          const ids = asStringArray(card.tagIds);
          if (!ids.includes(fromTagId)) return;

          card.tagIds = Array.from(
            new Set(ids.map((id) => (id === fromTagId ? intoTagId : id))),
          );
          card.updatedAt = new Date();
          updatedCards += 1;
        });

      await db.tags_v3
        .where("[userId+parentId]")
        .equals([currentUser.uid, fromTagId])
        .modify((raw: unknown) => {
          const childTag = raw as { parentId?: string; updatedAt?: Date };
          childTag.parentId = intoTagId;
          childTag.updatedAt = new Date();
        });

      await db.tags_v3.delete(fromTagId);
    });

    return { updatedCards };
  };

  const updateTagColor = async (
    nameOrId: string,
    color: string,
  ): Promise<void> => {
    if (!currentUser) return;

    const db = await getLocalDb(currentUser.uid);
    const tag =
      tagById.get(nameOrId) ??
      tagByName.get(nameOrId) ??
      tagByNameLower.get(nameOrId.toLowerCase());

    if (!tag) return;

    await db.tags_v3.update(tag.id, {
      color: normalizeTagColorKey(color),
      updatedAt: new Date(),
    });
  };

  const deleteTag = async (nameOrId: string): Promise<number> => {
    if (!currentUser) return 0;

    const tag =
      tagById.get(nameOrId) ??
      tagByName.get(nameOrId) ??
      tagByNameLower.get(nameOrId.toLowerCase());

    if (!tag) return 0;

    const { id: tagId } = tag;
    const db = await getLocalDb(currentUser.uid);
    let removedFromCards = 0;

    await db.transaction("rw", db.tags_v3, db.cards, async () => {
      await db.tags_v3
        .where("[userId+parentId]")
        .equals([currentUser.uid, tagId])
        .modify((raw: unknown) => {
          const childTag = raw as { parentId?: string; updatedAt?: Date };
          childTag.parentId = undefined;
          childTag.updatedAt = new Date();
        });

      await db.tags_v3.delete(tagId);

      await db.cards
        .where("userId")
        .equals(currentUser.uid)
        .modify((raw: unknown) => {
          const card = raw as Record<string, unknown> & CardTagFields;
          const idTags = asStringArray(card.tagIds);

          if (!idTags.includes(tagId)) return;

          card.tagIds = idTags.filter((id) => id !== tagId);
          card.updatedAt = new Date();
          removedFromCards += 1;
        });
    });

    return removedFromCards;
  };

  const addTagToCardsInFolder = async (
    folderId: string,
    tagId: string,
    includeSubfolders: boolean,
  ): Promise<number> => {
    if (!currentUser) return 0;

    const db = await getLocalDb(currentUser.uid);
    const targetFolderIds = new Set<string>([folderId]);

    if (includeSubfolders) {
      const allFolders = await db.folders
        .where("userId")
        .equals(currentUser.uid)
        .toArray();

      const collectChildren = (parentId: string) => {
        for (const folder of allFolders) {
          if (
            (folder as { parentFolderId?: string }).parentFolderId === parentId
          ) {
            targetFolderIds.add(folder.id);
            collectChildren(folder.id);
          }
        }
      };

      collectChildren(folderId);
    }

    const CHUNK = 100;
    let modified = 0;

    for (const targetId of targetFolderIds) {
      const ids = (await db.cards
        .where("[userId+folderId]" as Parameters<typeof db.cards.where>[0])
        .equals([currentUser.uid, targetId] as Parameters<
          typeof db.cards.where.equals
        >[0])
        .primaryKeys()) as string[];

      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);

        await db.transaction("rw", db.cards, async () => {
          await Promise.all(
            chunk.map(async (cardId) => {
              const card = await db.cards.get(cardId);
              if (!card) return;

              const existing = getCardTagIds(card);
              if (existing.includes(tagId)) return;

              await db.cards.update(cardId, {
                tagIds: [...existing, tagId],
                updatedAt: new Date(),
              });

              modified += 1;
            }),
          );
        });
      }
    }

    return modified;
  };

  const removeTagFromCardsInFolder = async (
    folderId: string,
    tagId: string,
    includeSubfolders: boolean,
  ): Promise<number> => {
    if (!currentUser) return 0;

    const db = await getLocalDb(currentUser.uid);
    const targetFolderIds = new Set<string>([folderId]);

    if (includeSubfolders) {
      const allFolders = await db.folders
        .where("userId")
        .equals(currentUser.uid)
        .toArray();

      const collectChildren = (parentId: string) => {
        for (const folder of allFolders) {
          if (
            (folder as { parentFolderId?: string }).parentFolderId === parentId
          ) {
            targetFolderIds.add(folder.id);
            collectChildren(folder.id);
          }
        }
      };

      collectChildren(folderId);
    }

    const CHUNK = 100;
    let modified = 0;

    for (const targetId of targetFolderIds) {
      const ids = (await db.cards
        .where("[userId+folderId]" as Parameters<typeof db.cards.where>[0])
        .equals([currentUser.uid, targetId] as Parameters<
          typeof db.cards.where.equals
        >[0])
        .primaryKeys()) as string[];

      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);

        await db.transaction("rw", db.cards, async () => {
          await Promise.all(
            chunk.map(async (cardId) => {
              const card = await db.cards.get(cardId);
              if (!card) return;

              const existing = getCardTagIds(card);
              if (!existing.includes(tagId)) return;

              await db.cards.update(cardId, {
                tagIds: existing.filter((id) => id !== tagId),
                updatedAt: new Date(),
              });

              modified += 1;
            }),
          );
        });
      }
    }

    return modified;
  };

  return {
    tags,
    tagById,
    availableColors: DEFAULT_TAG_COLOR_KEYS,
    getTagColorKey,
    getTagColorClassName,
    getTagColor,
    getCategoryName,
    setCategoryName,
    ensureCategory,
    setTagCategory,
    setTagParent,
    listCategoryIdsInUse,
    getTagChildrenMap,
    addTag,
    auditAndRepairTags,
    renameTag,
    mergeTags,
    updateTagColor,
    deleteTag,
    getTagUsageCount,
    addTagToCardsInFolder,
    removeTagFromCardsInFolder,
    ensurePathExists,
    moveSelectedTagToPath,
    getTagPathString,
    getTagIdByName,
    getTagNameById,
  };
};
