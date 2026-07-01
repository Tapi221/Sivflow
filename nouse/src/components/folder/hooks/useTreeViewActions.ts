import { useCallback } from "react";



interface UseTreeViewActionsParams {
  navigate?: (to: string) => void;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
}



const useTreeViewActions = ({ selectedFolderId, onFolderSelect }: UseTreeViewActionsParams) => {
  const handleFolderSelect = useCallback((folderId: string | null) => {
    onFolderSelect(folderId);
  },
  [onFolderSelect],
  );

  const handleStartStudy = useCallback(() => {
    if (!selectedFolderId) return;
    onFolderSelect(selectedFolderId);
  }, [onFolderSelect, selectedFolderId]);

  const handleViewCards = useCallback(() => {
    if (!selectedFolderId) return;
    onFolderSelect(selectedFolderId);
  }, [onFolderSelect, selectedFolderId]);

  const handleOpenCreateCard = useCallback(() => {
    if (!selectedFolderId) return;
    onFolderSelect(selectedFolderId);
  }, [onFolderSelect, selectedFolderId]);

  return {
    handleFolderSelect,
    handleStartStudy,
    handleViewCards,
    handleOpenCreateCard,
  };
};



export { useTreeViewActions };
