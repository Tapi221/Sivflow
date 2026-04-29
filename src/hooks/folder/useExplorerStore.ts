/**
 * useExplorerStore - Explorer状態管理フック
 *
 * 絞り込み状態とユーザー別のエクスプローラー表示設定をlocalStorageで永続化
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ContentTypeFilter = "card" | "pdf";
type ToggleableFlag = "any" | "on" | "off";
type TagMatchMode = "any" | "all";
type DirectoryBadgeVisibilityKey = "uncertainty" | "bookmarked" | "tags";
type ExplorerPinnedFolderId = string;

export type ExplorerLayoutMode = "list" | "card" | "icon" | "column";

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
  pinnedFolderIds: ExplorerPinnedFolderId[];
  explorerLayoutMode: ExplorerLayoutMode;
  isPinnedFolderSectionCollapsed: boolean;
  isFolderListSectionCollapsed: boolean;
  isTagSectionCollapsed: boolean;
  isCalendarSectionCollapsed: boolean;
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
  setPinnedFolderIds: (folderIds: string[]) => void;
  pinFolder: (folderId: string) => void;
  unpinFolder: (folderId: string) => void;
  togglePinnedFolder: (folderId: string) => void;
  setExplorerLayoutMode: (mode: ExplorerLayoutMode) => void;
  setPinnedFolderSectionCollapsed: (collapsed: boolean) => void;
  togglePinnedFolderSectionCollapsed: () => void;
  setFolderListSectionCollapsed: (collapsed: boolean) => void;
  toggleFolderListSectionCollapsed: () => void;
  setTagSectionCollapsed: (collapsed: boolean) => void;
  toggleTagSectionCollapsed: () => void;
  setCalendarSectionCollapsed: (collapsed: boolean) => void;
  toggleCalendarSectionCollapsed: () => void;
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

const normalizeTagMatchMode = (value: unknown): TagMatchMode => {
  return value === "all" ? "all" : "any";
};

const normalizeToggleableFlag = (value: unknown): ToggleableFlag => {
  if (value === "on" || value === "off") return value;
  return "any";
};

const normalizeExplorerLayoutMode = (value: unknown): ExplorerLayoutMode => {
  if (
    value === "list" ||
    value === "card" ||
    value === "icon" ||
    value === "column"
  ) {
    return value;
  }

  return DEFAULT_EXPLORER_LAYOUT_MODE;
};

const normalizeContentTypeFilter = (value: unknown): ContentTypeFilter[] => {
  if (!Array.isArray(value)) return [...DEFAULT_CONTENT_TYPE_FILTER];

  const next = value.filter(
    (entry): entry is ContentTypeFilter => entry === "card" || entry === "pdf",
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

const normalizePinnedFolderIds = (value: unknown): ExplorerPinnedFolderId[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter(
        (entry): entry is ExplorerPinnedFolderId => typeof entry === "string",
      ),
    ),
  );
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
  | "pinnedFolderIds"
  | "explorerLayoutMode"
  | "isPinnedFolderSectionCollapsed"
  | "isFolderListSectionCollapsed"
  | "isTagSectionCollapsed"
  | "isCalendarSectionCollapsed"
> => ({
  tagFilter: [],
  tagMatchMode: "any",
  uncertaintyFilter: "any",
  bookmarkedFilter: "any",
  draftFilter: "any",
  contentTypeFilter: [...DEFAULT_CONTENT_TYPE_FILTER],
  directoryBadgeVisibility: { ...DEFAULT_DIRECTORY_BADGE_VISIBILITY },
  pinnedFolderIds: [],
  explorerLayoutMode: DEFAULT_EXPLORER_LAYOUT_MODE,
  isPinnedFolderSectionCollapsed: false,
  isFolderListSectionCollapsed: false,
  isTagSectionCollapsed: false,
  isCalendarSectionCollapsed: false,
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
      setPinnedFolderIds: (folderIds) =>
        set({ pinnedFolderIds: normalizePinnedFolderIds(folderIds) }),
      pinFolder: (folderId) =>
        set((state) => {
          if (state.pinnedFolderIds.includes(folderId)) {
            return {};
          }

          return { pinnedFolderIds: [...state.pinnedFolderIds, folderId] };
        }),
      unpinFolder: (folderId) =>
        set((state) => ({
          pinnedFolderIds: state.pinnedFolderIds.filter(
            (id) => id !== folderId,
          ),
        })),
      togglePinnedFolder: (folderId) =>
        set((state) => {
          const exists = state.pinnedFolderIds.includes(folderId);

          return {
            pinnedFolderIds: exists
              ? state.pinnedFolderIds.filter((id) => id !== folderId)
              : [...state.pinnedFolderIds, folderId],
          };
        }),
      setExplorerLayoutMode: (mode) => set({ explorerLayoutMode: mode }),
      setPinnedFolderSectionCollapsed: (collapsed) =>
        set({ isPinnedFolderSectionCollapsed: collapsed }),
      togglePinnedFolderSectionCollapsed: () =>
        set((state) => ({
          isPinnedFolderSectionCollapsed: !state.isPinnedFolderSectionCollapsed,
        })),
      setFolderListSectionCollapsed: (collapsed) =>
        set({ isFolderListSectionCollapsed: collapsed }),
      toggleFolderListSectionCollapsed: () =>
        set((state) => ({
          isFolderListSectionCollapsed: !state.isFolderListSectionCollapsed,
        })),
      setTagSectionCollapsed: (collapsed) =>
        set({ isTagSectionCollapsed: collapsed }),
      toggleTagSectionCollapsed: () =>
        set((state) => ({
          isTagSectionCollapsed: !state.isTagSectionCollapsed,
        })),
      setCalendarSectionCollapsed: (collapsed) =>
        set({ isCalendarSectionCollapsed: collapsed }),
      toggleCalendarSectionCollapsed: () =>
        set((state) => ({
          isCalendarSectionCollapsed: !state.isCalendarSectionCollapsed,
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
        pinnedFolderIds: state.pinnedFolderIds,
        explorerLayoutMode: state.explorerLayoutMode,
        isPinnedFolderSectionCollapsed: state.isPinnedFolderSectionCollapsed,
        isFolderListSectionCollapsed: state.isFolderListSectionCollapsed,
        isTagSectionCollapsed: state.isTagSectionCollapsed,
        isCalendarSectionCollapsed: state.isCalendarSectionCollapsed,
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
        next.pinnedFolderIds = normalizePinnedFolderIds(
          next.pinnedFolderIds ?? next.pinnedItems,
        );
        next.explorerLayoutMode = normalizeExplorerLayoutMode(
          next.explorerLayoutMode,
        );
        next.isPinnedFolderSectionCollapsed =
          typeof next.isPinnedFolderSectionCollapsed === "boolean"
            ? next.isPinnedFolderSectionCollapsed
            : false;
        next.isFolderListSectionCollapsed =
          typeof next.isFolderListSectionCollapsed === "boolean"
            ? next.isFolderListSectionCollapsed
            : false;
        next.isTagSectionCollapsed =
          typeof next.isTagSectionCollapsed === "boolean"
            ? next.isTagSectionCollapsed
            : false;
        next.isCalendarSectionCollapsed =
          typeof next.isCalendarSectionCollapsed === "boolean"
            ? next.isCalendarSectionCollapsed
            : false;

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
