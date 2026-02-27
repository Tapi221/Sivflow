import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';

export interface Tag {
  name: string;
  color: string;
  userId: string;
  updatedAt: Date;
  rootFolderId?: string; // Legacy/Compat
}

export const DEFAULT_COLORS = [
  'bg-slate-100 text-slate-600 border-slate-200', // Default Gray
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

/**
 * useTags: ユーザー単位で共通管理されるタグを操作するホック
 */
export function useTags() {
  const { currentUser } = useAuth();

  const tags = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const db = await getLocalDb();
      // ユーザーIDのみでフィルタ。rootFolderId は無視
      return await db.tags_v2.where('userId').equals(currentUser.uid).toArray();
    },
    [currentUser],
    []
  );

  const getTagUsageCount = async (name: string): Promise<number> => {
    if (!currentUser) return 0;
    const db = await getLocalDb();
    const cards = await db.cards.where('userId').equals(currentUser.uid).toArray();
    return cards.reduce((count, card: any) => {
      const tags = Array.isArray(card?.tags) ? card.tags : [];
      return tags.includes(name) ? count + 1 : count;
    }, 0);
  };

  const getTagColor = (tagName: string) => {
    const tag = tags?.find(t => t.name === tagName);
    return tag?.color || DEFAULT_COLORS[0];
  };

  /**
   * タグを追加または取得。既に存在すれば色は変更等を行わず、存在しなければ新規作成。
   */
  const addTag = async (name: string, color: string = DEFAULT_COLORS[0]) => {
    if (!currentUser) return;
    
    const db = await getLocalDb();
    const existing = await db.tags_v2.get([currentUser.uid, name]);
    
    if (existing) {
       if (existing.color !== color) {
           await db.tags_v2.update([currentUser.uid, name], { color, updatedAt: new Date() });
       }
       return;
    }

    await db.tags_v2.add({
      name,
      color,
      userId: currentUser.uid,
      rootFolderId: 'GLOBAL', 
      updatedAt: new Date()
    });
  };

  const updateTagColor = async (name: string, color: string) => {
      if (!currentUser) return;
      const db = await getLocalDb();
      await db.tags_v2.update([currentUser.uid, name], { color, updatedAt: new Date() });
  };

  const deleteTag = async (name: string) => {
      if (!currentUser) return;
      const db = await getLocalDb();
      let removedFromCards = 0;
      await db.transaction('rw', db.tags_v2, db.cards, async () => {
        await db.tags_v2.delete([currentUser.uid, name]);
        await db.cards.where('userId').equals(currentUser.uid).modify((card: any) => {
          const tags = Array.isArray(card?.tags) ? card.tags : [];
          if (!tags.includes(name)) return;
          card.tags = tags.filter((t: unknown) => t !== name);
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
  };
}
