import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';

export type TagCategory = 'subject' | 'exam' | 'difficulty' | 'type';

export interface Tag {
  id: string;              // ★追加: 永続ID（これが本体）
  name: string;            // 表示名（リネーム可能にするためIDと分離）
  color: string;
  userId: string;
  updatedAt: Date;

  // 将来拡張用（今は使わなくてOK）
  categoryId?: TagCategory;
  parentId?: string;

  rootFolderId?: string;   // Legacy/Compat（残すなら残す）
}

export const DEFAULT_COLORS = [
  'bg-slate-100 text-slate-600 border-slate-200',
  'bg-red-50 text-red-600 border-red-200',
  'bg-orange-50 text-orange-600 border-orange-200',
  'bg-amber-50 text-amber-600 border-amber-200',
  'bg-green-50 text-green-600 border-green-200',
  'bg-emerald-50 text-emerald-600 border-emerald-200',
  'bg-teal-50 text-teal-600 border-teal-200',
  'bg-cyan-50 text-cyan-600 border-cyan-200',
  'bg-sky-50 text-sky-600 border-sky-200',
  'bg-blue-50 text-blue-600 border-blue-200',
  'bg-indigo-50 text-indigo-600 border-indigo-200',
  'bg-violet-50 text-violet-600 border-violet-200',
  'bg-purple-50 text-purple-600 border-purple-200',
  'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
  'bg-pink-50 text-pink-600 border-pink-200',
  'bg-rose-50 text-rose-600 border-rose-200',
];

const genId = () => {
  // randomUUIDがあればそれ。なければ雑にfallback（十分ユニーク）
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * useTags: ユーザー単位で共通管理されるタグを操作するフック
 *
 * ✅ 互換方針
 * - tags_v2 の主キーが [userId + name] のままでも動く（renameは別途対応推奨）
 * - card.tags(string[]) も card.tagIds(string[]) も両対応
 * - tags_v2 に id が無い既存データは、読み込み時に補完して更新する
 */
export function useTags() {
  const { currentUser } = useAuth();

  const tags = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const db = await getLocalDb();

      const list = (await db.tags_v2
        .where('userId')
        .equals(currentUser.uid)
        .toArray()) as Tag[];

      // ★既存タグに id が無い場合は補完（互換アップグレード）
      const missing = list.filter(t => !t?.id);
      if (missing.length) {
        await db.transaction('rw', db.tags_v2, async () => {
          for (const t of missing) {
            // tags_v2 のPKが [userId, name] 前提で update
            await db.tags_v2.update([currentUser.uid, t.name], {
              id: genId(),
              updatedAt: new Date(),
            });
          }
        });

        // 更新後の正しい値で返す
        return (await db.tags_v2
          .where('userId')
          .equals(currentUser.uid)
          .toArray()) as Tag[];
      }

      return list;
    },
    [currentUser],
    []
  );

  const tagByName = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const t of tags || []) map.set(t.name, t);
    return map;
  }, [tags]);

  const tagById = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const t of tags || []) map.set(t.id, t);
    return map;
  }, [tags]);

  const getTagColor = (tagName: string) => {
    const t = tagByName.get(tagName);
    return t?.color || DEFAULT_COLORS[0];
  };

  const getTagIdByName = (tagName: string) => {
    return tagByName.get(tagName)?.id ?? null;
  };

  const getTagNameById = (tagId: string) => {
    return tagById.get(tagId)?.name ?? null;
  };

  const getTagUsageCount = async (name: string): Promise<number> => {
    if (!currentUser) return 0;
    const db = await getLocalDb();
    const cards = await db.cards.where('userId').equals(currentUser.uid).toArray();

    const tagId = getTagIdByName(name);

    return cards.reduce((count, card: any) => {
      const nameTags = Array.isArray(card?.tags) ? card.tags : [];
      const idTags = Array.isArray(card?.tagIds) ? card.tagIds : [];
      const hitByName = nameTags.includes(name);
      const hitById = tagId ? idTags.includes(tagId) : false;
      return (hitByName || hitById) ? count + 1 : count;
    }, 0);
  };

  /**
   * タグを追加または取得。
   * 既に存在すれば色・idの不足だけ補完（余計な破壊をしない）
   */
  const addTag = async (name: string, color: string = DEFAULT_COLORS[0]) => {
    if (!currentUser) return;

    const db = await getLocalDb();
    const existing = (await db.tags_v2.get([currentUser.uid, name])) as Tag | undefined;

    if (existing) {
      const patch: Partial<Tag> = {};
      if (!existing.id) patch.id = genId();
      if (existing.color !== color) patch.color = color;
      if (Object.keys(patch).length) {
        patch.updatedAt = new Date();
        await db.tags_v2.update([currentUser.uid, name], patch);
      }
      return;
    }

    const now = new Date();
    await db.tags_v2.add({
      id: genId(),
      name,
      color,
      userId: currentUser.uid,
      rootFolderId: 'GLOBAL', // legacy
      updatedAt: now,
    } satisfies Tag);
  };

  const updateTagColor = async (name: string, color: string) => {
    if (!currentUser) return;
    const db = await getLocalDb();
    await db.tags_v2.update([currentUser.uid, name], { color, updatedAt: new Date() });
  };

  /**
   * タグ削除: tags_v2 から削除し、カードからも除去
   * - 旧: card.tags(string[])
   * - 新: card.tagIds(string[])
   * 両方から消す
   */
  const deleteTag = async (name: string) => {
    if (!currentUser) return 0;

    const tagId = getTagIdByName(name);
    const db = await getLocalDb();

    let removedFromCards = 0;

    await db.transaction('rw', db.tags_v2, db.cards, async () => {
      await db.tags_v2.delete([currentUser.uid, name]);

      await db.cards.where('userId').equals(currentUser.uid).modify((card: any) => {
        const nameTags = Array.isArray(card?.tags) ? card.tags : [];
        const idTags = Array.isArray(card?.tagIds) ? card.tagIds : [];

        const hadName = nameTags.includes(name);
        const hadId = tagId ? idTags.includes(tagId) : false;

        if (!hadName && !hadId) return;

        if (hadName) card.tags = nameTags.filter((t: unknown) => t !== name);
        if (hadId && tagId) card.tagIds = idTags.filter((id: unknown) => id !== tagId);

        card.updatedAt = new Date();
        removedFromCards += 1;
      });
    });

    return removedFromCards;
  };

  return {
    tags: tags || [],
    availableColors: DEFAULT_COLORS,

    // 互換API
    getTagColor,
    addTag,
    updateTagColor,
    deleteTag,
    getTagUsageCount,

    // ★移行・将来拡張用ヘルパー（今すぐ使わなくてもOK）
    getTagIdByName,
    getTagNameById,
  };
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';

export type TagCategory = 'subject' | 'exam' | 'difficulty' | 'type';

export interface Tag {
  // DBには未付与があり得るので optional（読み込み時に補完して実質必須にする）
  id?: string;
  name: string;
  color: string;
  userId: string;
  updatedAt: Date;
  rootFolderId?: string; // Legacy/Compat

  // 未来拡張（今は触らない）
  categoryId?: TagCategory;
  parentId?: string;
}

type TagWithId = Tag & { id: string };

// cards テーブルの型がここでは分からないので、必要最小限だけ扱う
type CardTagFields = {
  tags?: unknown;
  tagIds?: unknown;
  updatedAt?: Date;
};

export const DEFAULT_COLORS = [
  'bg-slate-100 text-slate-600 border-slate-200',
  'bg-red-50 text-red-600 border-red-200',
  'bg-orange-50 text-orange-600 border-orange-200',
  'bg-amber-50 text-amber-600 border-amber-200',
  'bg-green-50 text-green-600 border-green-200',
  'bg-emerald-50 text-emerald-600 border-emerald-200',
  'bg-teal-50 text-teal-600 border-teal-200',
  'bg-cyan-50 text-cyan-600 border-cyan-200',
  'bg-sky-50 text-sky-600 border-sky-200',
  'bg-blue-50 text-blue-600 border-blue-200',
  'bg-indigo-50 text-indigo-600 border-indigo-200',
  'bg-violet-50 text-violet-600 border-violet-200',
  'bg-purple-50 text-purple-600 border-purple-200',
  'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
  'bg-pink-50 text-pink-600 border-pink-200',
  'bg-rose-50 text-rose-600 border-rose-200',
];

const genId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const asStringArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
};

/**
 * useTags: ユーザー単位で共通管理されるタグを操作するホック
 *
 * ✅ 互換:
 * - tags_v2 のPKが [userId+name] のまま
 * - card.tags(string[]) と card.tagIds(string[]) 両対応
 * - tags_v2 の既存データに id が無ければ補完して update
 */
export function useTags() {
  const { currentUser } = useAuth();

  const tags = useLiveQuery(
    async () => {
      if (!currentUser) return [] as TagWithId[];

      const db = await getLocalDb();
      const list = (await db.tags_v2
        .where('userId')
        .equals(currentUser.uid)
        .toArray()) as Tag[];

      const missing = list.filter(t => !t?.id);

      if (missing.length) {
        await db.transaction('rw', db.tags_v2, async () => {
          for (const t of missing) {
            await db.tags_v2.update([currentUser.uid, t.name], {
              id: genId(),
              updatedAt: new Date(),
            });
          }
        });

        const fixed = (await db.tags_v2
          .where('userId')
          .equals(currentUser.uid)
          .toArray()) as Tag[];

        // id を強制（まだ無いなら最後の安全策で付与）
        return fixed.map(t => ({ ...t, id: t.id ?? genId() })) as TagWithId[];
      }

      return list.map(t => ({ ...t, id: t.id ?? genId() })) as TagWithId[];
    },
    [currentUser],
    []
  );

  const tagByName = useMemo(() => {
    const map = new Map<string, TagWithId>();
    for (const t of tags || []) map.set(t.name, t);
    return map;
  }, [tags]);

  const tagById = useMemo(() => {
    const map = new Map<string, TagWithId>();
    for (const t of tags || []) map.set(t.id, t);
    return map;
  }, [tags]);

  const getTagColor = (tagName: string) => {
    const t = tagByName.get(tagName);
    return t?.color || DEFAULT_COLORS[0];
  };

  const getTagIdByName = (tagName: string) => {
    return tagByName.get(tagName)?.id ?? null;
  };

  const getTagNameById = (tagId: string) => {
    return tagById.get(tagId)?.name ?? null;
  };

  const getTagUsageCount = async (name: string): Promise<number> => {
    if (!currentUser) return 0;

    const db = await getLocalDb();
    const cards = await db.cards.where('userId').equals(currentUser.uid).toArray();

    const tagId = getTagIdByName(name);

    return cards.reduce((count: number, c: unknown) => {
      const card = c as CardTagFields;
      const nameTags = asStringArray(card.tags);
      const idTags = asStringArray(card.tagIds);

      const hitByName = nameTags.includes(name);
      const hitById = tagId ? idTags.includes(tagId) : false;

      return hitByName || hitById ? count + 1 : count;
    }, 0);
  };

  const addTag = async (name: string, color: string = DEFAULT_COLORS[0]) => {
    if (!currentUser) return;

    const db = await getLocalDb();
    const existing = (await db.tags_v2.get([currentUser.uid, name])) as Tag | undefined;

    if (existing) {
      const patch: Partial<Tag> = {};
      if (!existing.id) patch.id = genId();
      if (existing.color !== color) patch.color = color;

      if (Object.keys(patch).length) {
        patch.updatedAt = new Date();
        await db.tags_v2.update([currentUser.uid, name], patch);
      }
      return;
    }

    await db.tags_v2.add({
      id: genId(),
      name,
      color,
      userId: currentUser.uid,
      rootFolderId: 'GLOBAL',
      updatedAt: new Date(),
    });
  };

  const updateTagColor = async (name: string, color: string) => {
    if (!currentUser) return;
    const db = await getLocalDb();
    await db.tags_v2.update([currentUser.uid, name], { color, updatedAt: new Date() });
  };

  const deleteTag = async (name: string) => {
    if (!currentUser) return 0;

    const tagId = getTagIdByName(name);
    const db = await getLocalDb();

    let removedFromCards = 0;

    await db.transaction('rw', db.tags_v2, db.cards, async () => {
      await db.tags_v2.delete([currentUser.uid, name]);

      await db.cards.where('userId').equals(currentUser.uid).modify((raw) => {
        const card = raw as unknown as CardTagFields & Record<string, unknown>;

        const nameTags = asStringArray(card.tags);
        const idTags = asStringArray(card.tagIds);

        const hadName = nameTags.includes(name);
        const hadId = tagId ? idTags.includes(tagId) : false;

        if (!hadName && !hadId) return;

        if (hadName) card.tags = nameTags.filter(t => t !== name);
        if (hadId && tagId) card.tagIds = idTags.filter(id => id !== tagId);

        card.updatedAt = new Date();
        removedFromCards += 1;
      });
    });

    return removedFromCards;
  };

  return {
    tags: tags || [],
    availableColors: DEFAULT_COLORS,
    getTagColor,
    addTag,
    updateTagColor,
    deleteTag,
    getTagUsageCount,

    // 移行/将来用
    getTagIdByName,
    getTagNameById,
  };
}