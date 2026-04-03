import React from "react";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { DirectoryDiagramPane } from "@/components/folder/panes/DirectoryDiagramPane";

export default function Directory() {
  const { cards = [] } = useCards();
  const { folders = [] } = useFolders();
  const { documents = [] } = useDocuments();

  return (
    <div className="h-full overflow-y-auto">
      <DirectoryDiagramPane
        folders={folders}
        cards={cards}
        documents={documents}
      />
    </div>
  );
}
