import { create } from "zustand";
import { persist } from "zustand/middleware";



type ContentTypeFilter = "card" | "pdf";
type ToggleableFlag = "any" | "on" | "off";
type TagMatchMode = "any" | "all";
type DirectoryBadgeVisibilityKey = "uncertainty" | "bookmarked" | "tags";
type ExplorerLayoutMode = "list" | "card" | "icon" | "column";
type DirectoryBadgeVisibility = {
  uncertainty: boolean;
  bookmarked: boolean;
  tags: boolean;
};
interface ExplorerState {
  tagFilter: string[];
  tagMatchMode: TagMatchMode;
  uncertaintyFilter: ToggleableFlag;
  bookmarkedFilter: ToggleableFlag;
  draftFilter: ToggleableFlag;
  contentTypeFilter: ContentTypeFilter[];
  directoryBadgeVisibility: DirectoryBadgeVisibility;
  explorerLayoutMode: ExplorerLayoutMode;
  pinnedFolderIds: string[];
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
  setExplorerLayoutMode: (mode: ExplorerLayoutMode) => void;
  togglePinnedFolder: (folderId: string) => void;
}



const DEFAULT_CONTENT_TYPE_FILTER: ContentTypeFilter[] = ["card", "pdf"];
const DEFAULT_EXPLORER_LAYOUT_MODE: ExplorerLayoutMode = "column";
const DEFAULT_DIRECTORY_BADGE_VISIBILITY: DirectoryBadgeVisibility = {
  uncertainty: true,
  bookmarked: true,
  tags: true,
};



const normalizeTagFilter = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
};
const normalizePinnedFolderIds = (value: unknown): string[] => {
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
const normalizeExplorerLayoutMode = (value: unknown): ExplorerLayoutMode => {
  if (value === "list" || value === "card" || value === "icon" || value === "column") {
    return value;
  }

  return DEFAULT_EXPLORER_LAYOUT_MODE;
};
const normalizeContentTypeFilter = (value: unknown): ContentTypeFilter[] => {
  if (!Array.isArray(value)) return [...DEFAULT_CONTENT_TYPE_FILTER];

  const next = value.filter((entry): entry is ContentTypeFilter => entry === "card" || entry === "pdf");

  return next.length > 0 ? next : [...DEFAULT_CONTENT_TYPE_FILTER];
};
const normalizeDirectoryBadgeVisibility = (value: unknown): DirectoryBadgeVisibility => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_DIRECTORY_BADGE_VISIBILITY };
  }

  const record = value as Partial<Record<DirectoryBadgeVisibilityKey, unknown>>;

  return {
    uncertainty: typeof record.uncertainty === "boolean" ? record.uncertainty : DEFAULT_DIRECTORY_BADGE_VISIBILITY.uncertainty,
    bookmarked: typeof record.bookmarked === "boolean" ? record.bookmarked : DEFAULT_DIRECTORY_BADGE_VISIBILITY.bookmarked,
    tags: typeof record.tags === "boolean" ? record.tags : DEFAULT_DIRECTORY_BADGE_VISIBILITY.tags,
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
  | "explorerLayoutMode"
  | "pinnedFolderIds"
> => ({
  tagFilter: [],
  tagMatchMode: "any",
  uncertaintyFilter: "any",
  bookmarkedFilter: "any",
  draftFilter: "any",
  contentTypeFilter: [...DEFAULT_CONTENT_TYPE_FILTER],
  directoryBadgeVisibility: { ...DEFAULT_DIRECTORY_BADGE_VISIBILITY },
  explorerLayoutMode: DEFAULT_EXPLORER_LAYOUT_MODE,
  pinnedFolderIds: [],
});



const useExplorerStore = create<ExplorerState>()(
  persist(
    (set) => ({
      ...createDefaultState(),
      setTagFilter: (tags) => set({ tagFilter: tags }),
      toggleTag: (tag) => set((state) => {
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
            const next = state.contentTypeFilter.filter((value) => value !== kind);

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
      setExplorerLayoutMode: (mode) => set({ explorerLayoutMode: mode }),
      togglePinnedFolder: (folderId) =>
        set((state) => ({
          pinnedFolderIds: state.pinnedFolderIds.includes(folderId)
            ? state.pinnedFolderIds.filter((currentId) => currentId !== folderId)
            : [...state.pinnedFolderIds, folderId],
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
        explorerLayoutMode: state.explorerLayoutMode,
        pinnedFolderIds: state.pinnedFolderIds,
      }),
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object") {
          return createDefaultState();
        }

        const next = { ...persistedState } as Record<string, unknown>;

        next.tagFilter = normalizeTagFilter(next.tagFilter);
        next.tagMatchMode = normalizeTagMatchMode(next.tagMatchMode);
        next.uncertaintyFilter = normalizeToggleableFlag(next.uncertaintyFilter);
        next.bookmarkedFilter = normalizeToggleableFlag(next.bookmarkedFilter);
        next.draftFilter = normalizeToggleableFlag(next.draftFilter);
        next.contentTypeFilter = normalizeContentTypeFilter(next.contentTypeFilter);
        next.directoryBadgeVisibility = normalizeDirectoryBadgeVisibility(next.directoryBadgeVisibility);
        next.explorerLayoutMode = normalizeExplorerLayoutMode(next.explorerLayoutMode);
        next.pinnedFolderIds = normalizePinnedFolderIds(next.pinnedFolderIds);

        delete next.recent;
        delete next.explorerTab;
        delete next.activeTab;
        delete next.favorites;
        delete next.pinnedItems;
        delete next.isPinnedFolderSectionCollapsed;
        delete next.isFolderListSectionCollapsed;
        delete next.isTagSectionCollapsed;
        delete next.isCalendarSectionCollapsed;

        return next;
      },
    },
  ),
);



export { useExplorerStore };


export type { ExplorerLayoutMode, ExplorerState };
