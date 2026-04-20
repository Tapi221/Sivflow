import { useCallback } from "react";
import {
  createAppDestination,
  createPageUrl,
} from "@/platform/web/navigation/toWebPath";

interface UseTreeViewActionsParams {
  navigate: (to: string) => void;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
}

export const useTreeViewActions = ({
  navigate,
  selectedFolderId,
  onFolderSelect,
}: UseTreeViewActionsParams) => {
  const handleFolderSelect = useCallback(
    (folderId: string | null) => {
      onFolderSelect(folderId);
    },
    [onFolderSelect],
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
    handleFolderSelect,
    handleStartStudy,
    handleViewCards,
    handleOpenCreateCard,
  };
};
