import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';
import type { TagV3Record } from '../services/localdb/types';

export type TagCategory = 'subject' | 'exam' | 'difficulty' | 'type';

/** useTags が外部に公開する Tag 型（TagV3Record と同じ形、nullable なし） */
export type Tag = TagV3Record;

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

const genId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const asStringArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
};

/**
 * useTags: ユーザー単位で共通管理されるタグを操作するフック
 *
 * ✅ tags_v3 (id 主体) を読み書きする。
 * ✅ 互換: card.tags(string[]) と card.tagIds(string[]) 両対応
 * ✅ tags_v2 が存在する環境でも migration 後は tags_v3 を使う
 */
export function useTags() {
  const { currentUser } = useAuth();

  const tags = useLiveQuery(
    async () => {
      if (!currentUser) return [] as Tag[];
      const db = await getLocalDb();
      return db.tags_v3.where('userId').equals(currentUser.uid).toArray();
    },
    [currentUser],
    [] as Tag[]
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

  /** name または nameLower で色を返す（UI互換） */
  const getTagColor = (tagNameOrId: string) => {
    const byName = tagByName.get(tagNameOrId) ?? tagByNameLower.get(tagNameOrId.toLowerCase()) ?? tagById.get(tagNameOrId);
    return byName?.color || DEFAULT_COLORS[0];
  };

  const getTagIdByName = (tagName: string): string | null => {
    return (tagByName.get(tagName) ?? tagByNameLower.get(tagName.toLowerCase()))?.id ?? null;
  };

  const getTagNameById = (tagId: string): string | null => {
    return tagById.get(tagId)?.name ?? null;
  };

  const getTagUsageCount = async (nameOrId: string): Promise<number> => {
    if (!currentUser) return 0;
    const db = await getLocalDb();

    // nameOrId が id なら直接、そうでなければ名前解決
    const tagId = tagById.has(nameOrId) ? nameOrId : (getTagIdByName(nameOrId) ?? null);
    const tagName = nameOrId;

    let count = 0;
    await db.cards.where('userId').equals(currentUser.uid).each((raw: unknown) => {
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
    if (!currentUser) throw new Error('not authenticated');

    const nameLower = name.toLowerCase();

    // 既存チェック（idempotent）
    const existing = await db.tags_v3
      .where('[userId+nameLower]')
      .equals([currentUser.uid, nameLower])
      .first();

    if (existing) {
      // color/categoryId に差分があれば更新
      const patch: Partial<Tag> = {};
      if (existing.color !== color) patch.color = color;
      if (categoryId && existing.categoryId !== categoryId) patch.categoryId = categoryId;
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

  const updateTagColor = async (nameOrId: string, color: string): Promise<void> => {
    if (!currentUser) return;
    const db = await getLocalDb();
    const tag = tagById.get(nameOrId) ?? tagByName.get(nameOrId) ?? tagByNameLower.get(nameOrId.toLowerCase());
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

    const tag = tagById.get(nameOrId) ?? tagByName.get(nameOrId) ?? tagByNameLower.get(nameOrId.toLowerCase());
    if (!tag) return 0;

    const { id: tagId, name: tagName } = tag;
    const db = await getLocalDb();
    let removedFromCards = 0;

    await db.transaction('rw', db.tags_v3, db.cards, async () => {
      await db.tags_v3.delete(tagId);

      await db.cards.where('userId').equals(currentUser.uid).modify((raw: unknown) => {
        const card = raw as Record<string, unknown> & CardTagFields;

        const nameTags = asStringArray(card.tags);
        const idTags = asStringArray(card.tagIds);

        const hadName = nameTags.includes(tagName);
        const hadId = idTags.includes(tagId);

        if (!hadName && !hadId) return;

        if (hadName) card.tags = nameTags.filter(t => t !== tagName);
        if (hadId) card.tagIds = idTags.filter(id => id !== tagId);

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
      const allFolders = await db.folders.where('userId').equals(currentUser.uid).toArray();
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
      const ids = await db.cards
        .where('[userId+folderId]' as Parameters<typeof db.cards.where>[0])
        .equals([currentUser.uid, tid] as Parameters<typeof db.cards.where.equals>[0])
        .primaryKeys() as string[];

      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        await db.transaction('rw', db.cards, async () => {
          await Promise.all(
            chunk.map(async (cardId) => {
              const card = await db.cards.get(cardId);
              if (!card) return;
              const existing = asStringArray((card as unknown as { tagIds?: unknown }).tagIds);
              if (existing.includes(tagId)) return;
              await db.cards.update(cardId, {
                tagIds: [...existing, tagId],
                updatedAt: new Date(),
              });
              modified += 1;
            })
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
      const allFolders = await db.folders.where('userId').equals(currentUser.uid).toArray();
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
      const ids = await db.cards
        .where('[userId+folderId]' as Parameters<typeof db.cards.where>[0])
        .equals([currentUser.uid, tid] as Parameters<typeof db.cards.where.equals>[0])
        .primaryKeys() as string[];

      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        await db.transaction('rw', db.cards, async () => {
          await Promise.all(
            chunk.map(async (cardId) => {
              const card = await db.cards.get(cardId);
              if (!card) return;
              const existing = asStringArray((card as unknown as { tagIds?: unknown }).tagIds);
              if (!existing.includes(tagId)) return;
              await db.cards.update(cardId, {
                tagIds: existing.filter(id => id !== tagId),
                updatedAt: new Date(),
              });
              modified += 1;
            })
          );
        });
      }
    }
    return modified;
  };

  return {
    tags,
    availableColors: DEFAULT_COLORS,
    getTagColor,
    addTag,
    updateTagColor,
    deleteTag,
    getTagUsageCount,
    addTagToCardsInFolder,
    removeTagFromCardsInFolder,

    // 移行/互換用
    getTagIdByName,
    getTagNameById,
  };
}
