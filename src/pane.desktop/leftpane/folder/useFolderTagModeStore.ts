import { create } from "zustand";

export type FolderTagMode = "folder" | "tag";

type FolderTagModeState = {
  folderTagMode: FolderTagMode;
  setFolderTagMode: (mode: FolderTagMode) => void;
};

export const useFolderTagModeStore = create<FolderTagModeState>((set) => ({
  folderTagMode: "folder",
  setFolderTagMode: (folderTagMode) => set({ folderTagMode }),
}));
