import type { UserSettings } from "@/types";

type FolderSidebarDisplayMode = NonNullable<
  UserSettings["folderSidebarDisplayMode"]
>;

const STORAGE_KEY = "flashcard-master:folder-sidebar-display-mode";

const normalizeFolderSidebarDisplayModePreference = (
  value: unknown,
): FolderSidebarDisplayMode => {
  return value === "navigation" ? "navigation" : "tree";
};

export const readCachedFolderSidebarDisplayMode =
  (): FolderSidebarDisplayMode => {
    if (typeof window === "undefined") return "tree";

    try {
      return normalizeFolderSidebarDisplayModePreference(
        window.localStorage.getItem(STORAGE_KEY),
      );
    } catch {
      return "tree";
    }
  };

export const writeCachedFolderSidebarDisplayMode = (value: unknown): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      normalizeFolderSidebarDisplayModePreference(value),
    );
  } catch {
    // ignore storage write failures
  }
};
