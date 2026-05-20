import React from "react";

import { DirectoryDiagramPane } from "@/components/folder/panes/DirectoryDiagramPane";

import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import type { DocumentItem } from "@/types";

const isDocumentItem = (value: unknown): value is DocumentItem => {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;
  return (
    record.kind === "pdf" &&
    typeof record.folderId === "string" &&
    typeof record.orderIndex === "number" &&
    typeof record.title === "string"
  );
};

const Directory = () => {
  const { cards = [], loading: cardsLoading } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();
  const { documents = [], loading: documentsLoading } = useDocuments();

  const normalizedDocuments = React.useMemo(() => {
    return documents.filter(isDocumentItem);
  }, [documents]);

  const isLoading = cardsLoading || foldersLoading || documentsLoading;

  if (isLoading) {
    return <div className="h-full overflow-y-auto" />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <DirectoryDiagramPane
        folders={folders}
        cards={cards}
        documents={normalizedDocuments}
      />
    </div>
  );
};

export default Directory;
