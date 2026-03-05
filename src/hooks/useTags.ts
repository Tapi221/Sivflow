import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDb } from "../services/localDB";
import { useAuth } from "../contexts/AuthContext";
import type { TagV3Record } from "../services/localdb/types";
import type { Card } from "../types";
import { useUserSettings } from "./useUserSettings";

export type TagCategory = string;

/** useTags が外部に公開する Tag 型（TagV3Record と同じ形、nullable なし） */
export type Tag = TagV3Record;

// cards テーブルの型がここでは分からないので、必要最小限だけ扱う
type CardTagFields = {
  userId?: string;
  tags?: unknown;
  tagIds?: unknown;
  updatedAt?: Date;
};

export const DEFAULT_COLORS = [
  "bg-slate-100 text-slate-600 border-slate-200",
  "bg-red-50 text-red-600 border-red-200",
  "bg-orange-50 text-orange-600 border-orange-200",
  "bg-amber-50 text-amber-600 border-amber-200",
  "bg-green-50 text-green-600 border-green-200",
  "bg-emerald-50 text-emerald-600 border-emerald-200",
  "bg-teal-50 text-teal-600 border-teal-200",
  "bg-cyan-50 text-cyan-600 border-cyan-200",
  "bg-sky-50 text-sky-600 border-sky-200",
  "bg-blue-50 text-blue-600 border-blue-200",
  "bg-indigo-50 text-indigo-600 border-indigo-200",
  "bg-violet-50 text-violet-600 border-violet-200",
  "bg-purple-50 text-purple-600 border-purple-200",
  "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200",
  "bg-pink-50 text-pink-600 border-pink-200",
  "bg-rose-50 text-rose-600 border-rose-200",
];

const genId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const genCategoryId = (): string => `cat_${genId()}`;

const MAX_PATH_DEPTH = 12;

/** "/" 区切りのパス文字列をセグメント配列に変換する純関数 */
export const parseTagPath = (pathStr: string): string[] | { error: string } => {
  const segments = pathStr
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (segments.length === 0) return { error: "パスを入力してください。" };
  if (segments.length > MAX_PATH_DEPTH)
    return { error: `パスの深さは最大 ${MAX_PATH_DEPTH} です。` };
  return segments;
};

const asStringArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
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

/**
 * tagIds → タグ名に解決。tagIds が空なら legacy card.tags にフォールバック。
 * pure utility: フックの外でも呼べる。
 */
export function resolveCardTagNames(
  tagIds: unknown,
  legacyTags: unknown,
  tagById: ReadonlyMap<string, Pick<TagV3Record, "name">>,
): string[] {
  const ids = asStringArray(tagIds);
  if (ids.length > 0) {
    const names = ids.map((id) => tagById.get(id)?.name ?? "").filter((n) => n);
    if (names.length > 0) return names;
  }
  return asStringArray(legacyTags);
}

export async function auditAndRepairTags(
  userId: string,
): Promise<TagRepairSummary> {
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
        )
          return;
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
}

/**
 * useTags: ユーザー単位で共通管理されるタグを操作するフック
 *
 * ✅ tags_v3 (id 主体) を読み書きする。
 * ✅ 互換: card.tags(string[]) と card.tagIds(string[]) 両対応
 * ✅ tags_v2 が存在する環境でも migration 後は tags_v3 を使う
 */
export function useTags() {
  const { currentUser } = useAuth();
  const { settings, updateSettings } = useUserSettings();

  const tags = useLiveQuery(
    async () => {
      if (!currentUser) return [] as Tag[];
      const db = await getLocalDb();
      return db.tags_v3.where("userId").equals(currentUser.uid).toArray();
    },
    [currentUser],
    [] as Tag[],
  );

  const tagByName = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const t of tags) map.set(t.name, t);
    return map;
  }, [tags]);

  const tagByNameLower = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const t of tags) map.set(t.nameLower, t);
    return map;
  }, [tags]);

  const tagById = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const t of tags) map.set(t.id, t);
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

  /** name または nameLower で色を返す（UI互換） */
  const getTagColor = (tagNameOrId: string) => {
    const byName =
      tagByName.get(tagNameOrId) ??
      tagByNameLower.get(tagNameOrId.toLowerCase()) ??
      tagById.get(tagNameOrId);
    return byName?.color || DEFAULT_COLORS[0];
  };

  const getTagIdByName = (tagName: string): string | null => {
    return (
      (tagByName.get(tagName) ?? tagByNameLower.get(tagName.toLowerCase()))
        ?.id ?? null
    );
  };

  const getTagNameById = (tagId: string): string | null => {
    return tagById.get(tagId)?.name ?? null;
  };

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
    const db = await getLocalDb();
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

    const db = await getLocalDb();
    await db.tags_v3.update(tagId, {
      parentId: normalizedParentId,
      updatedAt: new Date(),
    });
  };

  const listCategoryIdsInUse = (): string[] => categoryIdsInUse;

  const getTagUsageCount = async (nameOrId: string): Promise<number> => {
    if (!currentUser) return 0;
    const db = await getLocalDb();

    // nameOrId が id なら直接、そうでなければ名前解決
    const tagId = tagById.has(nameOrId)
      ? nameOrId
      : (getTagIdByName(nameOrId) ?? null);
    const tagName = tagId ? (tagById.get(tagId)?.name ?? nameOrId) : nameOrId;
    let indexedCount = 0;

    if (tagId) {
      // multiEntry index (*tagIds) を使った高速カウント（userId でフィルタ）
      try {
        indexedCount = await db.cards
          .where("tagIds")
          .equals(tagId)
          .and((card) => card.userId === currentUser.uid)
          .count();
      } catch {
        indexedCount = -1;
      }
    }

    if (indexedCount >= 0) {
      let legacyOnlyCount = 0;
      await db.cards
        .where("userId")
        .equals(currentUser.uid)
        .each((raw: unknown) => {
          const card = raw as CardTagFields;
          const idTags = asStringArray(card.tagIds);
          if (idTags.length > 0) return;
          const nameTags = asStringArray(card.tags);
          if (nameTags.includes(tagName)) legacyOnlyCount += 1;
        });
      return indexedCount + legacyOnlyCount;
    }

    // フォールバック: 全件走査（legacy card.tags も考慮）
    let count = 0;
    await db.cards
      .where("userId")
      .equals(currentUser.uid)
      .each((raw: unknown) => {
        const card = raw as CardTagFields;
        const nameTags = asStringArray(card.tags);
        const idTags = asStringArray(card.tagIds);
        const hitByName = nameTags.includes(tagName);
        const hitById = tagId ? idTags.includes(tagId) : false;
        if (hitByName || hitById) count += 1;
      });
    return count;
  };

  /**
   * タグを追加または取得。
   * nameLower が既存なら color だけ更新（重複作成しない）
   */
  const addTag = async (
    name: string,
    color: string = DEFAULT_COLORS[0],
    categoryId?: TagCategory,
    parentId?: string,
  ): Promise<Tag> => {
    const db = await getLocalDb();
    if (!currentUser) throw new Error("not authenticated");

    const nameLower = name.toLowerCase();

    // 既存チェック（idempotent）
    const existing = await db.tags_v3
      .where("[userId+nameLower]")
      .equals([currentUser.uid, nameLower])
      .first();

    if (existing) {
      // color/categoryId に差分があれば更新
      const patch: Partial<Tag> = {};
      if (existing.color !== color) patch.color = color;
      if (categoryId && existing.categoryId !== categoryId)
        patch.categoryId = categoryId;
      if (parentId && existing.parentId !== parentId) patch.parentId = parentId;
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
      color,
      userId: currentUser.uid,
      updatedAt: new Date(),
      ...(categoryId ? { categoryId } : {}),
      ...(parentId ? { parentId } : {}),
    };
    await db.tags_v3.add(newTag);
    return newTag;
  };

  /**
   * パス文字列で指定された階層を辿り、必要な中間タグを自動生成して末端 tagId を返す。
   * 同じ親の下に同名タグが存在する場合は再利用（重複作成しない）。
   */
  const ensurePathExists = async (
    fullPath: string,
  ): Promise<{ leafTagId: string } | { error: string }> => {
    if (!currentUser) return { error: "ログイン状態を確認してください。" };
    const parsed = parseTagPath(fullPath);
    if ("error" in parsed) return parsed;

    const db = await getLocalDb();
    let parentId: string | undefined = undefined;
    let lastTagId = "";

    for (const segment of parsed) {
      const nameLower = segment.toLowerCase();
      const candidates = await db.tags_v3
        .where("[userId+nameLower]")
        .equals([currentUser.uid, nameLower])
        .toArray();

      const existing = candidates.find((t) =>
        parentId === undefined ? !t.parentId : t.parentId === parentId,
      );

      if (existing) {
        lastTagId = existing.id;
        parentId = existing.id;
      } else {
        const newTag: Tag = {
          id: genId(),
          name: segment,
          nameLower,
          color: DEFAULT_COLORS[0],
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

  /**
   * 選択中タグを parentPath で指定した親の下に移動する。
   * parentPath が空ならルートに戻す。中間タグは自動生成。
   * 循環チェックはローカルマップ（tagById + 新規生成分）で行う。
   */
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

    const db = await getLocalDb();
    // tagById は live query 由来なので新規作成分を手動で追跡する
    const localMap = new Map<string, Pick<Tag, "parentId">>(tagById);
    let parentId: string | undefined = undefined;

    for (const segment of parsed) {
      const nameLower = segment.toLowerCase();
      const candidates = await db.tags_v3
        .where("[userId+nameLower]")
        .equals([currentUser.uid, nameLower])
        .toArray();

      const existing = candidates.find((t) =>
        parentId === undefined ? !t.parentId : t.parentId === parentId,
      );

      if (existing) {
        localMap.set(existing.id, existing);
        parentId = existing.id;
      } else {
        const newTag: Tag = {
          id: genId(),
          name: segment,
          nameLower,
          color: DEFAULT_COLORS[0],
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
    if (finalParentId === tagId)
      return { error: "自分自身を親にはできません。" };

    // 循環チェック（localMap を使って ancestor chain を辿る）
    const visited = new Set<string>();
    let cur: string | undefined = finalParentId;
    while (cur) {
      if (visited.has(cur)) break;
      if (cur === tagId) return { error: "循環は禁止です。" };
      visited.add(cur);
      cur = localMap.get(cur)?.parentId;
    }

    await db.tags_v3.update(tagId, {
      parentId: finalParentId,
      updatedAt: new Date(),
    });
  };

  /**
   * tagId のルートから葉までのパス文字列を返す（例: "JavaScript/DOM/innerHTML"）。
   * 循環混入時は visited で打ち切り。
   */
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

  /**
   * タグ名変更。nameLower が既存の別タグと重複する場合はエラーを返す（マージは行わない）。
   * カード更新は不要（tagIds参照のため）。
   */
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
    const db = await getLocalDb();

    if (newNameLower !== tag.nameLower) {
      const existing = await db.tags_v3
        .where("[userId+nameLower]")
        .equals([currentUser.uid, newNameLower])
        .first();
      if (existing && existing.id !== tagId)
        return { error: `「${trimmedName}」はすでに存在します。` };
    }

    await db.tags_v3.update(tagId, {
      name: trimmedName,
      nameLower: newNameLower,
      updatedAt: new Date(),
    });
  };

  /**
   * タグマージ: fromTagId を intoTagId に統合。
   * cards.tagIds を走査し fromTagId → intoTagId に置換（modify で全件ロード回避）。
   * fromTagId を tags_v3 から削除。重複 tagIds は Set で排除。
   */
  const mergeTags = async (
    fromTagId: string,
    intoTagId: string,
  ): Promise<{ updatedCards: number } | { error: string }> => {
    if (!currentUser) return { error: "ログイン状態を確認してください。" };
    if (fromTagId === intoTagId) return { error: "統合元と統合先が同じです。" };
    const db = await getLocalDb();
    const fromTag = tagById.get(fromTagId);
    const intoTag = tagById.get(intoTagId);
    if (!fromTag || !intoTag)
      return { error: "統合対象のタグが見つかりません。" };

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
    const db = await getLocalDb();
    const tag =
      tagById.get(nameOrId) ??
      tagByName.get(nameOrId) ??
      tagByNameLower.get(nameOrId.toLowerCase());
    if (!tag) return;
    await db.tags_v3.update(tag.id, { color, updatedAt: new Date() });
  };

  /**
   * タグ削除: tags_v3 から削除し、カードからも除去
   * - card.tags(string[]) からも除去（互換）
   * - card.tagIds(string[]) からも除去
   */
  const deleteTag = async (nameOrId: string): Promise<number> => {
    if (!currentUser) return 0;

    const tag =
      tagById.get(nameOrId) ??
      tagByName.get(nameOrId) ??
      tagByNameLower.get(nameOrId.toLowerCase());
    if (!tag) return 0;

    const { id: tagId, name: tagName } = tag;
    const db = await getLocalDb();
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

          const nameTags = asStringArray(card.tags);
          const idTags = asStringArray(card.tagIds);

          const hadName = nameTags.includes(tagName);
          const hadId = idTags.includes(tagId);

          if (!hadName && !hadId) return;

          if (hadName) card.tags = nameTags.filter((t) => t !== tagName);
          if (hadId) card.tagIds = idTags.filter((id) => id !== tagId);

          card.updatedAt = new Date();
          removedFromCards += 1;
        });
    });

    return removedFromCards;
  };

  /**
   * フォルダ配下カードに一括タグ付与。
   * @returns 実際に変更したカード枚数
   */
  const addTagToCardsInFolder = async (
    folderId: string,
    tagId: string,
    includeSubfolders: boolean,
  ): Promise<number> => {
    if (!currentUser) return 0;
    const db = await getLocalDb();

    // 対象 folderId 収集
    const targetFolderIds = new Set<string>([folderId]);
    if (includeSubfolders) {
      const allFolders = await db.folders
        .where("userId")
        .equals(currentUser.uid)
        .toArray();
      const collectChildren = (parentId: string) => {
        for (const f of allFolders) {
          if ((f as { parentFolderId?: string }).parentFolderId === parentId) {
            targetFolderIds.add(f.id);
            collectChildren(f.id);
          }
        }
      };
      collectChildren(folderId);
    }

    const CHUNK = 100;
    let modified = 0;

    for (const tid of targetFolderIds) {
      const ids = (await db.cards
        .where("[userId+folderId]" as Parameters<typeof db.cards.where>[0])
        .equals([currentUser.uid, tid] as Parameters<
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

  /**
   * フォルダ配下カードから一括タグ除去。
   * @returns 実際に変更したカード枚数
   */
  const removeTagFromCardsInFolder = async (
    folderId: string,
    tagId: string,
    includeSubfolders: boolean,
  ): Promise<number> => {
    if (!currentUser) return 0;
    const db = await getLocalDb();

    const targetFolderIds = new Set<string>([folderId]);
    if (includeSubfolders) {
      const allFolders = await db.folders
        .where("userId")
        .equals(currentUser.uid)
        .toArray();
      const collectChildren = (parentId: string) => {
        for (const f of allFolders) {
          if ((f as { parentFolderId?: string }).parentFolderId === parentId) {
            targetFolderIds.add(f.id);
            collectChildren(f.id);
          }
        }
      };
      collectChildren(folderId);
    }

    const CHUNK = 100;
    let modified = 0;

    for (const tid of targetFolderIds) {
      const ids = (await db.cards
        .where("[userId+folderId]" as Parameters<typeof db.cards.where>[0])
        .equals([currentUser.uid, tid] as Parameters<
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
    availableColors: DEFAULT_COLORS,
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

    // パス操作
    ensurePathExists,
    moveSelectedTagToPath,
    getTagPathString,

    // 移行/互換用
    getTagIdByName,
    getTagNameById,
  };
}
