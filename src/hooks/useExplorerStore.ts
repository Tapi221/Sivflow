/**
 * useExplorerStore - Explorer状態管理フック
 * 
 * Pinned, Recent, タブ状態をlocalStorageで永続化
 */
import { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 型定義
export type ExplorerTab = 'pinned' | 'explorer' | 'recent' | 'inbox';

export interface PinnedItem {
  type: 'folder' | 'card' | 'document';
  id: string;
}

export interface RecentItem {
  type: 'folder' | 'card' | 'document';
  id: string;
  ts: number; // タイムスタンプ
}

export interface ExplorerState {
  // タブ状態
  activeTab: ExplorerTab; // Deprecated but kept for compatibility
  explorerTab: ExplorerTab;
  setExplorerTab: (tab: ExplorerTab) => void;

  // Pinned
  pinnedItems: PinnedItem[];
  pinItem: (item: PinnedItem) => void;
  unpinItem: (item: PinnedItem) => void;
  reorderPinnedItems: (newPinnedItems: PinnedItem[]) => void;
  isPinned: (type: 'folder' | 'card' | 'document', id: string) => boolean;

  // Recent
  recent: RecentItem[];
  addRecent: (item: Omit<RecentItem, 'ts'>) => void;
  clearRecent: () => void;

  // Tag Filter State
  tagFilter: string[];
  tagMatchMode: 'any' | 'all';
  uncertaintyFilter: 'any' | 'on' | 'off';
  bookmarkedFilter: 'any' | 'on' | 'off';
  draftFilter: 'any' | 'on' | 'off';
  setTagFilter: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  clearTagFilter: () => void;
  clearAllFilters: () => void;
  setTagMatchMode: (mode: 'any' | 'all') => void;
  setUncertaintyFilter: (mode: 'any' | 'on' | 'off') => void;
  setBookmarkedFilter: (mode: 'any' | 'on' | 'off') => void;
  setDraftFilter: (mode: 'any' | 'on' | 'off') => void;
}

// 定数
const MAX_PINNED_ITEMS = 20;
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

      // Pinned
      pinnedItems: [],
      pinItem: (item) => set((state) => {
        const exists = state.pinnedItems.some(p => p.type === item.type && p.id === item.id);
        if (exists) return state;
        // 先頭に追加、最大数制限
        return { pinnedItems: [item, ...state.pinnedItems].slice(0, MAX_PINNED_ITEMS) };
      }),
      unpinItem: (item) => set((state) => ({
        pinnedItems: state.pinnedItems.filter(p => !(p.type === item.type && p.id === item.id))
      })),
      reorderPinnedItems: (newPinnedItems) => set({ pinnedItems: newPinnedItems }),
      isPinned: (type, id) => {
        // state helper
        return false; // Not used directly, hook consumers check state.pinnedItems
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
      uncertaintyFilter: 'any',
      bookmarkedFilter: 'any',
      draftFilter: 'any',
      setTagFilter: (tags) => set({ tagFilter: tags }),
      toggleTag: (tag) => set((state) => {
        const exists = state.tagFilter.includes(tag);
        const newFilter = exists 
          ? state.tagFilter.filter(t => t !== tag) 
          : [...state.tagFilter, tag];
        return { tagFilter: newFilter };
      }),
      clearTagFilter: () => set({ tagFilter: [] }),
      clearAllFilters: () =>
        set({
          tagFilter: [],
          tagMatchMode: 'any',
          uncertaintyFilter: 'any',
          bookmarkedFilter: 'any',
          draftFilter: 'any',
        }),
      setTagMatchMode: (mode) => set({ tagMatchMode: mode }),
      setUncertaintyFilter: (mode) => set({ uncertaintyFilter: mode }),
      setBookmarkedFilter: (mode) => set({ bookmarkedFilter: mode }),
      setDraftFilter: (mode) => set({ draftFilter: mode }),
    }),
    {
      name: 'explorer-storage',
      partialize: (state) => ({
        explorerTab: state.explorerTab,
        pinnedItems: state.pinnedItems,
        recent: state.recent,
        tagFilter: state.tagFilter,
        tagMatchMode: state.tagMatchMode,
        uncertaintyFilter: state.uncertaintyFilter,
        bookmarkedFilter: state.bookmarkedFilter,
        draftFilter: state.draftFilter,
      }),
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState;
        const next = { ...persistedState };

        if (next.explorerTab === 'favorites') {
          next.explorerTab = 'pinned';
        }

        if (!Array.isArray(next.pinnedItems) && Array.isArray(next.favorites)) {
          next.pinnedItems = next.favorites;
        }
        delete next.favorites;

        return next;
      },
    }
  )
);
