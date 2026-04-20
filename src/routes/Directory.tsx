
import React from "react";

import { DirectoryScreenSkeleton } from "@/components/loading/ScreenSkeletons";
import { DirectoryDiagramPane } from "@/components/folder/panes/DirectoryDiagramPane";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";

const Directory = () => {
  const { cards = [], loading: cardsLoading } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();
  const { documents = [], loading: documentsLoading } = useDocuments();

  const isLoading = cardsLoading || foldersLoading || documentsLoading;

  if (isLoading) {
    return <DirectoryScreenSkeleton />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <DirectoryDiagramPane
        folders={folders}
        cards={cards}
        documents={documents}
      />
    </div>
  );
};

export default Directory;
