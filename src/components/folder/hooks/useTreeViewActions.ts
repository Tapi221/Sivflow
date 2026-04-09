import { useCallback } from "react";
import {
  createAppDestination,
  createPageUrl,
} from "@/platform/web/navigation/toWebPath";

interface UseTreeViewActionsParams {
  navigate: (to: string) => void;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  addRecent: (item: { type: "folder"; id: string }) => void;
}

export const useTreeViewActions = ({
  navigate,
  selectedFolderId,
  onFolderSelect,
  addRecent,
}: UseTreeViewActionsParams) => {
  const handleFolderSelectWithRecent = useCallback(
    (folderId: string | null) => {
      onFolderSelect(folderId);
      if (folderId) {
        addRecent({ type: "folder", id: folderId });
      }
    },
    [addRecent, onFolderSelect],
  );

  const handleStartStudy = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(
      createPageUrl(
        createAppDestination("studyMode", { folderId: selectedFolderId }),
      ),
    );
  }, [navigate, selectedFolderId]);

  const handleViewCards = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(
      createPageUrl(
        createAppDestination("cardSetView", { folderId: selectedFolderId }),
      ),
    );
  }, [navigate, selectedFolderId]);

  const handleOpenCreateCard = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(
      createPageUrl(
        createAppDestination("cardEdit", { folderId: selectedFolderId }),
      ),
    );
  }, [navigate, selectedFolderId]);

  return {
    handleFolderSelectWithRecent,
    handleStartStudy,
    handleViewCards,
    handleOpenCreateCard,
  };
};
