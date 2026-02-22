/**
 * useExplorerStore - Explorer状態管理フック
 * 
 * Favorites, Recent, タブ状態をlocalStorageで永続化
 */
import { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 型定義
export type ExplorerTab = 'favorites' | 'explorer' | 'recent' | 'trash' | 'inbox';

export interface FavoriteItem {
  type: 'folder' | 'card';
  id: string;
}

export interface RecentItem {
  type: 'folder' | 'card';
  id: string;
  ts: number; // タイムスタンプ
}

export interface ExplorerState {
  // タブ状態
  activeTab: ExplorerTab; // Deprecated but kept for compatibility
  explorerTab: ExplorerTab;
  setExplorerTab: (tab: ExplorerTab) => void;

  // Favorites
  favorites: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (item: FavoriteItem) => void;
  reorderFavorites: (newFavorites: FavoriteItem[]) => void;
  isFavorite: (type: 'folder' | 'card', id: string) => boolean;

  // Recent
  recent: RecentItem[];
  addRecent: (item: Omit<RecentItem, 'ts'>) => void;
  clearRecent: () => void;

  // Tag Filter State
  tagFilter: string[];
  tagMatchMode: 'any' | 'all';
  setTagFilter: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  clearTagFilter: () => void;
  setTagMatchMode: (mode: 'any' | 'all') => void;
}

// 定数
const MAX_FAVORITES = 20;
const MAX_RECENT = 30;

/**
 * Explorer状態管理フック (Zustand + Persist)
 */
export const useExplorerStore = create<ExplorerState>()(
  persist(
    (set, get) => ({
      // タブ初期値
      activeTab: 'explorer',
      explorerTab: 'explorer',
      setExplorerTab: (tab) => set({ explorerTab: tab }),

      // Favorites
      favorites: [],
      addFavorite: (item) => set((state) => {
        const exists = state.favorites.some(f => f.type === item.type && f.id === item.id);
        if (exists) return state;
        // 先頭に追加、最大数制限
        return { favorites: [item, ...state.favorites].slice(0, MAX_FAVORITES) };
      }),
      removeFavorite: (item) => set((state) => ({
        favorites: state.favorites.filter(f => !(f.type === item.type && f.id === item.id))
      })),
      reorderFavorites: (newFavorites) => set({ favorites: newFavorites }),
      isFavorite: (type, id) => {
        // state helper
        return false; // Not used directly, hook consumers check state.favorites
      },

      // Recent
      recent: [],
      addRecent: (item) => set((state) => {
        const filtered = state.recent.filter(r => !(r.type === item.type && r.id === item.id));
        const newRecent = [
          { ...item, ts: Date.now() },
          ...filtered
        ].slice(0, MAX_RECENT);
        return { recent: newRecent };
      }),
      clearRecent: () => set({ recent: [] }),

      // Tag Filter
      tagFilter: [],
      tagMatchMode: 'any',
      setTagFilter: (tags) => set({ tagFilter: tags }),
      toggleTag: (tag) => set((state) => {
        const exists = state.tagFilter.includes(tag);
        const newFilter = exists 
          ? state.tagFilter.filter(t => t !== tag) 
          : [...state.tagFilter, tag];
        return { tagFilter: newFilter };
      }),
      clearTagFilter: () => set({ tagFilter: [] }),
      setTagMatchMode: (mode) => set({ tagMatchMode: mode }),
    }),
    {
      name: 'explorer-storage',
      partialize: (state) => ({
        explorerTab: state.explorerTab,
        favorites: state.favorites,
        recent: state.recent,
        tagFilter: state.tagFilter,
        tagMatchMode: state.tagMatchMode,
      }),
    }
  )
);
