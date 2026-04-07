import { useCallback } from "react";
import { createPageUrl } from "@/utils";

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
    navigate(createPageUrl(`StudyMode?folderId=${selectedFolderId}`));
  }, [navigate, selectedFolderId]);

  const handleViewCards = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(createPageUrl(`CardSetView?folderId=${selectedFolderId}`));
  }, [navigate, selectedFolderId]);

  const handleOpenCreateCard = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(createPageUrl(`CardEdit?folderId=${selectedFolderId}`));
  }, [navigate, selectedFolderId]);

  return {
    handleFolderSelectWithRecent,
    handleStartStudy,
    handleViewCards,
    handleOpenCreateCard,
  };
};
