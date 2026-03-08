import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { ArrowLeft } from "@/ui/icons";
import React from "react";
import { RightPane } from "@/components/folder/panes/RightPane";

interface TreeViewMainPaneProps {
  isMobile: boolean;
  showMobileDetail: boolean;
  mobileDetailTitle: string;
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
  onItemSelect,
  onFolderSelect,
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
      {isMobile && showMobileDetail && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => {
              onItemSelect(null);
              onFolderSelect(null);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="一覧に戻る"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700">
            {mobileDetailTitle}
          </span>
        </div>
      )}

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
        onRenameFolder={onRenameFolder}
        handlers={handlers}
      />
    </div>
  );
}


