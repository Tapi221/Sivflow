import { useCallback, useState } from "react";
import { createPageUrl } from "@/utils";

interface UseTreeViewActionsParams {
  navigate: (to: string) => void;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  addRecent: (item: { type: "folder"; id: string }) => void;
}

export function useTreeViewActions({
  navigate,
  selectedFolderId,
  onFolderSelect,
  addRecent,
}: UseTreeViewActionsParams) {
  const [isCreateSelectionOpen, setIsCreateSelectionOpen] = useState(false);
  const [isModeSelectionOpen, setIsModeSelectionOpen] = useState(false);
  const [isViewManagerOpen, setIsViewManagerOpen] = useState(false);
  const [createFolderRequestToken, setCreateFolderRequestToken] = useState(0);

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
    navigate(createPageUrl(`CardView?folderId=${selectedFolderId}`));
  }, [navigate, selectedFolderId]);

  const handleOpenCreateCard = useCallback(() => {
    if (!selectedFolderId) return;
    setIsCreateSelectionOpen(true);
  }, [selectedFolderId]);

  const handleSelectCreateMode = useCallback(
    (mode: "single" | "continuous") => {
      if (!selectedFolderId) return;
      setIsCreateSelectionOpen(false);

      if (mode === "single") {
        navigate(createPageUrl(`CardEdit?folderId=${selectedFolderId}`));
        return;
      }

      setIsModeSelectionOpen(true);
    },
    [navigate, selectedFolderId],
  );

  const handleSelectDetailedMode = useCallback(
    (mode: string, options?: { hideTitle?: boolean }) => {
      if (!selectedFolderId) return;
      setIsModeSelectionOpen(false);

      if (mode === "qa") {
        const hideTitle = options?.hideTitle ? "&hideTitle=true" : "";
        navigate(
          createPageUrl(`one-qa-mode?folderId=${selectedFolderId}${hideTitle}`),
        );
        return;
      }

      if (mode === "pair") {
        navigate(createPageUrl(`pair-mode?folderId=${selectedFolderId}`));
        return;
      }

      if (mode === "choice") {
        navigate(
          createPageUrl(`four-choice-mode?folderId=${selectedFolderId}`),
        );
        return;
      }

      navigate(
        createPageUrl(`create-mode/placeholder?folderId=${selectedFolderId}`),
      );
    },
    [navigate, selectedFolderId],
  );

  const handleCreateRootFolder = useCallback(() => {
    setCreateFolderRequestToken((prev) => prev + 1);
  }, []);

  return {
    isCreateSelectionOpen,
    setIsCreateSelectionOpen,
    isModeSelectionOpen,
    setIsModeSelectionOpen,
    isViewManagerOpen,
    setIsViewManagerOpen,
    createFolderRequestToken,
    handleFolderSelectWithRecent,
    handleStartStudy,
    handleViewCards,
    handleOpenCreateCard,
    handleSelectCreateMode,
    handleSelectDetailedMode,
    handleCreateRootFolder,
  };
}

