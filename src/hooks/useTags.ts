import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';

export interface Tag {
  name: string;
  color: string;
  userId: string;
  rootFolderId: string;
  updatedAt: Date;
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

export function useTags(rootFolderId?: string) {
  const { currentUser } = useAuth();

  const tags = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      if (rootFolderId) {
          return await localDb.tags.where({ rootFolderId }).toArray();
      }
      return await localDb.tags.toArray();
    },
    [currentUser, rootFolderId],
    []
  );

  const getTagColor = (tagName: string, targetRootFolderId?: string) => {
    // try to find exact match
    const tag = tags?.find(t => t.name === tagName && (!targetRootFolderId || t.rootFolderId === targetRootFolderId));
    // Fallback: if we just want color by name (legacy support or cross-folder view), pick the first one
    return tag?.color || tags?.find(t => t.name === tagName)?.color || DEFAULT_COLORS[0];
  };

  const addTag = async (name: string, color: string = DEFAULT_COLORS[0], targetRootFolderId: string) => {
    if (!currentUser || !targetRootFolderId) return;
    
    // Check if exists
    const existing = await localDb.tags.get({ rootFolderId: targetRootFolderId, name });
    
    if (existing) {
       if (existing.color !== color) {
           await localDb.tags.update([targetRootFolderId, name], { color, updatedAt: new Date() });
       }
       return;
    }

    await localDb.tags.add({
      name,
      color,
      userId: currentUser.uid,
      rootFolderId: targetRootFolderId,
      updatedAt: new Date()
    });
  };

  const updateTagColor = async (name: string, color: string, targetRootFolderId: string) => {
      if (!currentUser || !targetRootFolderId) return;
      await localDb.tags.update([targetRootFolderId, name], { color, updatedAt: new Date() });
  };

  const deleteTag = async (name: string, targetRootFolderId: string) => {
      if (!currentUser || !targetRootFolderId) return;
      await localDb.tags.delete([targetRootFolderId, name]);
  };

  return {
    tags: tags || [],
    availableColors: DEFAULT_COLORS,
    getTagColor,
    addTag,
    updateTagColor,
    deleteTag
  };
}
