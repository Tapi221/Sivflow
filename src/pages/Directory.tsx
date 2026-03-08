import React from "react";
import { useCards } from "@/hooks/useCards";
import { useFolders } from "@/hooks/useFolders";
import { useDocuments } from "@/hooks/useDocuments";
import { DirectoryDiagramPane } from "@/components/folder/DirectoryDiagramPane";

export default function Directory() {
  const { cards = [] } = useCards();
  const { folders = [] } = useFolders();
  const { documents = [] } = useDocuments();

  return (
    <div className="h-full overflow-y-auto">
      <DirectoryDiagramPane folders={folders} cards={cards} documents={documents} />
    </div>
  );
}
