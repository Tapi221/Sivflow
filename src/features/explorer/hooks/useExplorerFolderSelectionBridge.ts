import { useEffect } from "react";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import type { Folder } from "@/types";

type Params = {
  folders: Folder[];
  onSelectFolder: (folderId: string | null) => void;
  onNavigateToSectionList: () => void;
};

export const useExplorerFolderSelectionBridge = ({
  folders,
  onSelectFolder,
  onNavigateToSectionList,
}: Params) => {
  const { registerFolderSelectHandler } = useBreadcrumbContext();

  useEffect(() => {
    registerFolderSelectHandler((folderId) => {
      onSelectFolder(folderId ?? null);

      if (!folderId) {
        onNavigateToSectionList();
        return;
      }

      const folder = folders.find((entry) => entry.id === folderId);

      if (folder && !folder.parentFolderId) {
        onNavigateToSectionList();
      }
    });
  }, [
    folders,
    onNavigateToSectionList,
    onSelectFolder,
    registerFolderSelectHandler,
  ]);
};
