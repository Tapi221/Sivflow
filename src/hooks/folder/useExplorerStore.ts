/**
 * useExplorerStore - Explorer状態管理フック
 *
 * Recent, タブ状態をlocalStorageで永続化
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// 型定義
export type ExplorerTab = "explorer" | "recent" | "inbox";

export interface RecentItem {
  type: "folder" | "card" | "document";
  id: string;
  ts: number; // タイムスタンプ
}

export interface ExplorerState {
  // タブ状態
  activeTab: ExplorerTab; // Deprecated but kept for compatibility
  explorerTab: ExplorerTab;
  setExplorerTab: (tab: ExplorerTab) => void;

  // Recent
  recent: RecentItem[];
  addRecent: (item: Omit<RecentItem, "ts">) => void;
  clearRecent: () => void;

  // Tag Filter State
  tagFilter: string[];
  tagMatchMode: "any" | "all";
  uncertaintyFilter: "any" | "on" | "off";
  bookmarkedFilter: "any" | "on" | "off";
  draftFilter: "any" | "on" | "off";
  contentTypeFilter: ("card" | "pdf" | "pptx")[];
  directoryBadgeVisibility: {
    uncertainty: boolean;
    bookmarked: boolean;
    tags: boolean;
  };
  setTagFilter: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  clearTagFilter: () => void;
  clearAllFilters: () => void;
  setTagMatchMode: (mode: "any" | "all") => void;
  setUncertaintyFilter: (mode: "any" | "on" | "off") => void;
  setBookmarkedFilter: (mode: "any" | "on" | "off") => void;
  setDraftFilter: (mode: "any" | "on" | "off") => void;
  toggleContentType: (kind: "card" | "pdf" | "pptx") => void;
  toggleDirectoryBadgeVisibility: (
    key: "uncertainty" | "bookmarked" | "tags",
  ) => void;
}

// 定数
const MAX_RECENT = 30;

/**
 * Explorer状態管理フック (Zustand + Persist)
 */
export const useExplorerStore = create<ExplorerState>()(
  persist(
    (set) => ({
      // タブ初期値
      activeTab: "explorer",
      explorerTab: "explorer",
      setExplorerTab: (tab) => set({ explorerTab: tab }),

      // Recent
      recent: [],
      addRecent: (item) =>
        set((state) => {
          const filtered = state.recent.filter(
            (r) => !(r.type === item.type && r.id === item.id),
          );
          const newRecent = [{ ...item, ts: Date.now() }, ...filtered].slice(
            0,
            MAX_RECENT,
          );
          return { recent: newRecent };
        }),
      clearRecent: () => set({ recent: [] }),

      // Tag Filter
      tagFilter: [],
      tagMatchMode: "any",
      uncertaintyFilter: "any",
      bookmarkedFilter: "any",
      draftFilter: "any",
      contentTypeFilter: ["card", "pdf", "pptx"],
      directoryBadgeVisibility: {
        uncertainty: true,
        bookmarked: true,
        tags: true,
      },
      setTagFilter: (tags) => set({ tagFilter: tags }),
      toggleTag: (tag) =>
        set((state) => {
          const exists = state.tagFilter.includes(tag);
          const newFilter = exists
            ? state.tagFilter.filter((t) => t !== tag)
            : [...state.tagFilter, tag];
          return { tagFilter: newFilter };
        }),
      clearTagFilter: () => set({ tagFilter: [] }),
      clearAllFilters: () =>
        set({
          tagFilter: [],
          tagMatchMode: "any",
          uncertaintyFilter: "any",
          bookmarkedFilter: "any",
          draftFilter: "any",
          contentTypeFilter: ["card", "pdf", "pptx"],
        }),
      setTagMatchMode: (mode) => set({ tagMatchMode: mode }),
      setUncertaintyFilter: (mode) => set({ uncertaintyFilter: mode }),
      setBookmarkedFilter: (mode) => set({ bookmarkedFilter: mode }),
      setDraftFilter: (mode) => set({ draftFilter: mode }),
      toggleContentType: (kind) =>
        set((state) => {
          const exists = state.contentTypeFilter.includes(kind);
          if (exists) {
            const next = state.contentTypeFilter.filter(
              (value) => value !== kind,
            );
            return { contentTypeFilter: next.length > 0 ? next : [kind] };
          }
          return { contentTypeFilter: [...state.contentTypeFilter, kind] };
        }),
      toggleDirectoryBadgeVisibility: (key) =>
        set((state) => ({
          directoryBadgeVisibility: {
            ...state.directoryBadgeVisibility,
            [key]: !state.directoryBadgeVisibility[key],
          },
        })),
    }),
    {
      name: "explorer-storage",
      partialize: (state) => ({
        explorerTab: state.explorerTab,
        recent: state.recent,
        tagFilter: state.tagFilter,
        tagMatchMode: state.tagMatchMode,
        uncertaintyFilter: state.uncertaintyFilter,
        bookmarkedFilter: state.bookmarkedFilter,
        draftFilter: state.draftFilter,
        contentTypeFilter: state.contentTypeFilter,
        directoryBadgeVisibility: state.directoryBadgeVisibility,
      }),
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object")
          return persistedState;
        const next = { ...persistedState };

        if (next.explorerTab === "favorites") {
          next.explorerTab = "explorer";
        }

        if (next.explorerTab === "pinned" || next.explorerTab === "views") {
          next.explorerTab = "explorer";
        }

        delete next.favorites;
        delete next.pinnedItems;

        return next;
      },
    },
  ),
);
