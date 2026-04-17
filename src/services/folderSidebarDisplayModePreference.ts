import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";
import type { UserSettings } from "@/types";

type FolderSidebarDisplayMode = NonNullable<
  UserSettings["folderSidebarDisplayMode"]
>;

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
        window.localStorage.getItem(
          SHARED_STORAGE_KEYS.folderSidebarDisplayMode,
        ),
      );
    } catch {
      return "tree";
    }
  };

export const writeCachedFolderSidebarDisplayMode = (value: unknown): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SHARED_STORAGE_KEYS.folderSidebarDisplayMode,
      normalizeFolderSidebarDisplayModePreference(value),
    );
  } catch {
    // ignore storage write failures
  }
};