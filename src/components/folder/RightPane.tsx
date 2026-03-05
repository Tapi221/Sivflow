import React from "react";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { CardPane } from "./CardPane";
import { FolderDashboard } from "./FolderDashboard";
import { DirectoryDiagramPane } from "./DirectoryDiagramPane";
import { PdfPane } from "@/components/pdf/PdfPane";
import { PowerPointPane } from "@/components/pptx/PowerPointPane";
import Dashboard from "@/pages/Dashboard";
import Gallery from "@/pages/Gallery";
import Calendar from "@/pages/Calendar";
import Trash from "@/pages/Trash";

interface RightPaneProps {
  selectedItem: SelectedExplorerItem;
  selectedCardId: string | null;
  selectedDocument: DocumentItem | null;
  selectedFolderId: string | null;
  selectedFolderName: string;
  folders: Folder[];
  cards: Card[];
  documents: DocumentItem[];
  folderCards: Card[];
  folderStats: {
    dueCount: number;
    unlearnedCount: number;
    lastReviewedAt: Date | null;
  };
  onCardUpdated: () => void;
  onDocumentUpdated?: (
    documentId: string,
    updates: Partial<DocumentItem>,
  ) => Promise<void>;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreateCard: () => void;
  };
}

export function RightPane({
  selectedItem,
  selectedCardId,
  selectedDocument,
  selectedFolderId,
  selectedFolderName,
  folders,
  cards,
  documents,
  folderCards,
  folderStats,
  onCardUpdated,
  onDocumentUpdated,
  handlers,
}: RightPaneProps) {
  if (selectedItem?.type === "today-study") {
    return <Dashboard />;
  }
  if (selectedItem?.type === "gallery") {
    return <Gallery />;
  }
  if (selectedItem?.type === "directory") {
    return (
      <DirectoryDiagramPane
        folders={folders}
        cards={cards}
        documents={documents}
      />
    );
  }
  if (selectedItem?.type === "calendar") {
    return <Calendar />;
  }
  if (selectedItem?.type === "settings") {
    return <Dashboard />;
  }
  if (selectedItem?.type === "trash") {
    return <Trash />;
  }

  if (selectedDocument) {
    if (selectedDocument.kind === "pptx") {
      return <PowerPointPane doc={selectedDocument} />;
    }
    return (
      <PdfPane
        doc={selectedDocument}
        onDocumentUpdate={
          onDocumentUpdated
            ? (updates) =>
                onDocumentUpdated(
                  selectedDocument.id,
                  updates as Partial<DocumentItem>,
                )
            : undefined
        }
      />
    );
  }

  if (selectedCardId) {
    return (
      <CardPane selectedCardId={selectedCardId} onCardUpdated={onCardUpdated} />
    );
  }

  if (selectedFolderId) {
    return (
      <FolderDashboard
        folderId={selectedFolderId}
        folderName={selectedFolderName}
        cards={folderCards}
        stats={folderStats}
        handlers={handlers}
      />
    );
  }

  return <CardPane selectedCardId={null} onCardUpdated={onCardUpdated} />;
}
