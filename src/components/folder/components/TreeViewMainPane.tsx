import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import React from "react";
import { RightPane } from "@/components/folder/panes/RightPane";

interface TreeViewMainPaneProps {
  isMobile: boolean;
  showMobileDetail: boolean;
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
  onItemSelect: (item: SelectedExplorerItem) => void;
  onFolderSelect: (folderId: string | null) => void;
  onCardUpdated: () => void;
  onDocumentUpdated: (
    documentId: string,
    updates: Partial<DocumentItem>,
  ) => Promise<void> | void;
  onRenameFolder: (folderId: string, newName: string) => Promise<void> | void;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreateCard: () => void;
  };
}

export function TreeViewMainPane({
  isMobile,
  showMobileDetail,
  mobileDetailTitle,
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
  onRenameFolder,
  handlers,
}: TreeViewMainPaneProps) {
  return (
    <div
      className={cn(
        "flex-1 min-h-0 min-w-0 bg-white flex-col",
        showMobileDetail ? "flex" : "hidden md:flex",
      )}
    >
      <RightPane
        selectedItem={selectedItem}
        selectedCardId={selectedCardId}
        selectedDocument={selectedDocument}
        selectedFolderId={selectedFolderId}
        selectedFolderName={selectedFolderName}
        folders={folders}
        cards={cards}
        documents={documents}
        folderCards={folderCards}
        folderStats={folderStats}
        onCardUpdated={onCardUpdated}
        onDocumentUpdated={onDocumentUpdated}
        onRenameFolder={
          onRenameFolder && selectedFolderId
            ? (newName: string) => onRenameFolder(selectedFolderId, newName)
            : undefined
        }
        handlers={handlers}
      />
    </div>
  );
}


