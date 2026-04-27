import { FolderDashboard } from "@/components/folder/components/views/FolderDashboard";
import { CardPane } from "@/components/folder/panes/CardPane";
import { DirectoryDiagramPane } from "@/components/folder/panes/DirectoryDiagramPane";
import { PdfPane } from "@/components/pdf/PdfPane";
import Gallery from "@/routes/Gallery";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";

type PdfPaneUpdateHandler = NonNullable<
  React.ComponentProps<typeof PdfPane>["onDocumentUpdate"]
>;
type PdfPaneUpdates = Parameters<PdfPaneUpdateHandler>[0];

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
  onCardUpdated: () => void;
  onDocumentUpdated?: (
    documentId: string,
    updates: Partial<DocumentItem>,
  ) => Promise<void> | void;
  onRenameFolder?: (newName: string) => Promise<void>;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreateCard: () => void;
  };
  folderSelectionNonce: number;
}

const UnsupportedDocumentPane = () => {
  return (
    <div className="flex h-full items-center justify-center bg-transparent p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <div className="mb-2 text-base font-semibold text-slate-800">
          この形式は現在サポート対象外です
        </div>
        <div>
          PowerPoint の表示機能は廃止しました。必要な資料は PDF
          に変換して再アップロードしてください。
        </div>
      </div>
    </div>
  );
};

export const RightPane = ({
  selectedItem,
  selectedCardId,
  selectedDocument,
  selectedFolderId,
  selectedFolderName,
  folders,
  cards,
  documents,
  folderCards,
  onCardUpdated,
  onDocumentUpdated,
  onRenameFolder,
  handlers,
  folderSelectionNonce,
}: RightPaneProps) => {
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
  if (selectedItem?.type === "trash") {
    return <CardPane selectedCardId={null} onCardUpdated={onCardUpdated} />;
  }

  if (selectedDocument) {
    if (selectedDocument.kind !== "pdf") {
      return <UnsupportedDocumentPane />;
    }

    return (
      <PdfPane
        doc={selectedDocument}
        onDocumentUpdate={
          onDocumentUpdated
            ? async (updates: PdfPaneUpdates) => {
                await onDocumentUpdated(
                  selectedDocument.id,
                  updates as Partial<DocumentItem>,
                );
              }
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
        handlers={handlers}
        onRenameFolder={onRenameFolder}
        folderSelectionNonce={folderSelectionNonce}
      />
    );
  }

  return <CardPane selectedCardId={null} onCardUpdated={onCardUpdated} />;
};
