import React, { useEffect, useState } from "react";
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
import { EmptyMetaPanel } from "@/components/card/panels/EmptyMetaPanel";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/ui/icons";

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
  const [isMetaOpen, setIsMetaOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("folder-dashboard.meta-panel-open") !== "false";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("folder-dashboard.meta-panel-open", String(isMetaOpen));
  }, [isMetaOpen]);

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
      <div className="h-full min-h-0 flex relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-3 z-20 h-8 w-8 rounded-full bg-[var(--sidebar-bg)] text-[#334155] surface-control-convex hover:bg-[var(--sidebar-active-bg)]"
          style={{
            right: isMetaOpen
              ? "calc(var(--ui-panel-width) - var(--ui-space-3))"
              : "var(--ui-space-1)",
            transform: "none",
          }}
          onClick={() => setIsMetaOpen((prev) => !prev)}
          aria-label={isMetaOpen ? "close meta panel" : "open meta panel"}
        >
          {isMetaOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <FolderDashboard
            folderId={selectedFolderId}
            folderName={selectedFolderName}
            cards={folderCards}
            handlers={handlers}
          />
        </div>
        {isMetaOpen && (
          <EmptyMetaPanel
            className="hidden md:block"
            contentClassName="space-y-3"
          >
            <section className="rounded-2xl border border-[var(--surface-border)] bg-white surface-concave p-3">
              <h3 className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[var(--sidebar-text-muted)]">
                フォルダ情報
              </h3>
              <p className="text-sm text-[#334155] break-anywhere">
                {selectedFolderName}
              </p>
              <div className="text-xs text-[var(--sidebar-text-muted)] space-y-1">
                <p>カード数: {folderCards.length}</p>
                <p>今日やる: {folderStats.dueCount ?? 0}</p>
                <p>未学習: {folderStats.unlearnedCount ?? 0}</p>
              </div>
            </section>
          </EmptyMetaPanel>
        )}
      </div>
    );
  }

  return <CardPane selectedCardId={null} onCardUpdated={onCardUpdated} />;
}
