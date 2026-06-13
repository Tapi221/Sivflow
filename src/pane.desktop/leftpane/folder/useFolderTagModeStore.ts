import { create } from "zustand";



type FolderTagMode = "folder" | "tag";
type FolderTagModeState = {
  folderTagMode: FolderTagMode;
  setFolderTagMode: (mode: FolderTagMode) => void;
};



const useFolderTagModeStore = create<FolderTagModeState>((set) => ({ folderTagMode: "folder", setFolderTagMode: (folderTagMode) => set({ folderTagMode }) }));



export { useFolderTagModeStore };


export type { FolderTagMode };
