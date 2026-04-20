/**
 * useExplorerStore - Explorer状態管理フック
 *
 * 絞り込み状態をlocalStorageで永続化
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ContentTypeFilter = "card" | "pdf";
type ToggleableFlag = "any" | "on" | "off";
type TagMatchMode = "any" | "all";
type DirectoryBadgeVisibilityKey = "uncertainty" | "bookmarked" | "tags";

type DirectoryBadgeVisibility = {
  uncertainty: boolean;
  bookmarked: boolean;
  tags: boolean;
};

export interface ExplorerState {
  tagFilter: string[];
  tagMatchMode: TagMatchMode;
  uncertaintyFilter: ToggleableFlag;
  bookmarkedFilter: ToggleableFlag;
  draftFilter: ToggleableFlag;
  contentTypeFilter: ContentTypeFilter[];
  directoryBadgeVisibility: DirectoryBadgeVisibility;
  setTagFilter: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  clearTagFilter: () => void;
  clearAllFilters: () => void;
  setTagMatchMode: (mode: TagMatchMode) => void;
  setUncertaintyFilter: (mode: ToggleableFlag) => void;
  setBookmarkedFilter: (mode: ToggleableFlag) => void;
  setDraftFilter: (mode: ToggleableFlag) => void;
  toggleContentType: (kind: ContentTypeFilter) => void;
  toggleDirectoryBadgeVisibility: (key: DirectoryBadgeVisibilityKey) => void;
}

const DEFAULT_CONTENT_TYPE_FILTER: ContentTypeFilter[] = ["card", "pdf"];

const DEFAULT_DIRECTORY_BADGE_VISIBILITY: DirectoryBadgeVisibility = {
  uncertainty: true,
  bookmarked: true,
  tags: true,
};

const normalizeTagFilter = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
};

const normalizeTagMatchMode = (value: unknown): TagMatchMode => {
  return value === "all" ? "all" : "any";
};

const normalizeToggleableFlag = (value: unknown): ToggleableFlag => {
  if (value === "on" || value === "off") return value;
  return "any";
};

const normalizeContentTypeFilter = (value: unknown): ContentTypeFilter[] => {
  if (!Array.isArray(value)) return [...DEFAULT_CONTENT_TYPE_FILTER];

  const next = value.filter(
    (entry): entry is ContentTypeFilter =>
      entry === "card" || entry === "pdf",
  );

  return next.length > 0 ? next : [...DEFAULT_CONTENT_TYPE_FILTER];
};

const normalizeDirectoryBadgeVisibility = (
  value: unknown,
): DirectoryBadgeVisibility => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_DIRECTORY_BADGE_VISIBILITY };
  }

  const record = value as Partial<Record<DirectoryBadgeVisibilityKey, unknown>>;

  return {
    uncertainty:
      typeof record.uncertainty === "boolean"
        ? record.uncertainty
        : DEFAULT_DIRECTORY_BADGE_VISIBILITY.uncertainty,
    bookmarked:
      typeof record.bookmarked === "boolean"
        ? record.bookmarked
        : DEFAULT_DIRECTORY_BADGE_VISIBILITY.bookmarked,
    tags:
      typeof record.tags === "boolean"
        ? record.tags
        : DEFAULT_DIRECTORY_BADGE_VISIBILITY.tags,
  };
};

const createDefaultState = (): Pick<
  ExplorerState,
  | "tagFilter"
  | "tagMatchMode"
  | "uncertaintyFilter"
  | "bookmarkedFilter"
  | "draftFilter"
  | "contentTypeFilter"
  | "directoryBadgeVisibility"
> => ({
  tagFilter: [],
  tagMatchMode: "any",
  uncertaintyFilter: "any",
  bookmarkedFilter: "any",
  draftFilter: "any",
  contentTypeFilter: [...DEFAULT_CONTENT_TYPE_FILTER],
  directoryBadgeVisibility: { ...DEFAULT_DIRECTORY_BADGE_VISIBILITY },
});

export const useExplorerStore = create<ExplorerState>()(
  persist(
    (set) => ({
      ...createDefaultState(),
      setTagFilter: (tags) => set({ tagFilter: tags }),
      toggleTag: (tag) =>
        set((state) => {
          const exists = state.tagFilter.includes(tag);
          const next = exists
            ? state.tagFilter.filter((currentTag) => currentTag !== tag)
            : [...state.tagFilter, tag];

          return { tagFilter: next };
        }),
      clearTagFilter: () => set({ tagFilter: [] }),
      clearAllFilters: () =>
        set({
          tagFilter: [],
          tagMatchMode: "any",
          uncertaintyFilter: "any",
          bookmarkedFilter: "any",
          draftFilter: "any",
          contentTypeFilter: [...DEFAULT_CONTENT_TYPE_FILTER],
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

            return {
              contentTypeFilter: next.length > 0 ? next : [kind],
            };
          }

          return {
            contentTypeFilter: [...state.contentTypeFilter, kind],
          };
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
        tagFilter: state.tagFilter,
        tagMatchMode: state.tagMatchMode,
        uncertaintyFilter: state.uncertaintyFilter,
        bookmarkedFilter: state.bookmarkedFilter,
        draftFilter: state.draftFilter,
        contentTypeFilter: state.contentTypeFilter,
        directoryBadgeVisibility: state.directoryBadgeVisibility,
      }),
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object") {
          return createDefaultState();
        }

        const next = { ...persistedState } as Record<string, unknown>;

        next.tagFilter = normalizeTagFilter(next.tagFilter);
        next.tagMatchMode = normalizeTagMatchMode(next.tagMatchMode);
        next.uncertaintyFilter = normalizeToggleableFlag(
          next.uncertaintyFilter,
        );
        next.bookmarkedFilter = normalizeToggleableFlag(next.bookmarkedFilter);
        next.draftFilter = normalizeToggleableFlag(next.draftFilter);
        next.contentTypeFilter = normalizeContentTypeFilter(
          next.contentTypeFilter,
        );
        next.directoryBadgeVisibility = normalizeDirectoryBadgeVisibility(
          next.directoryBadgeVisibility,
        );

        delete next.recent;
        delete next.explorerTab;
        delete next.activeTab;
        delete next.favorites;
        delete next.pinnedItems;

        return next;
      },
    },
  ),
);
