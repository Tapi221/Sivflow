import { FolderDashboard } from "@/components/folder/components/views/FolderDashboard";
import { CardPane } from "./CardPane";
import { CardSetViewScreen } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewScreen";
import { PdfDocumentPane } from "@/features/pdf/PdfDocumentPane";
import type { Card, DocumentItem, SelectedExplorerItem } from "@/types";



type RightPaneProps = {
  selectedItem: SelectedExplorerItem;
  selectedCardId: string | null;
  selectedDocument: DocumentItem | null;
  selectedFolderId: string | null;
  selectedFolderName: string;
  folderCards: Card[];
  onCardUpdated: () => void;
  onDocumentUpdated?: (documentId: string, updates: Partial<DocumentItem>) => Promise<void> | void;
  onRenameFolder?: (newName: string) => Promise<void>;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreateCard: () => void;
  };
  folderSelectionNonce: number;
};



const UnsupportedDocumentPane = () => {
  return (
    <div className="flex h-full items-center justify-center bg-transparent p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <div className="mb-2 text-base font-semibold text-slate-800">
          この形式は現在サポート対象外です
        </div>
        PowerPoint の表示機能は廃止しました。必要な資料は PDF
        に変換して再アップロードしてください。
      </div>
    </div>
  );
};
const RightPane = ({ selectedItem, selectedCardId, selectedDocument, selectedFolderId, selectedFolderName, folderCards, onCardUpdated, onDocumentUpdated, onRenameFolder, handlers, folderSelectionNonce }: RightPaneProps) => {
  if (selectedItem?.type === "trash") {
    return <CardPane selectedCardId={null} onCardUpdated={onCardUpdated} />;
  }

  if (selectedItem?.type === "cardSet") {
    return <CardSetViewScreen cardSetId={selectedItem.id} />;
  }

  if (selectedDocument) {
    if (selectedDocument.kind !== "pdf") {
      return <UnsupportedDocumentPane />;
    }

    return (
      <PdfDocumentPane
        document={selectedDocument}
        onDocumentUpdate={
          onDocumentUpdated
            ? async (updates: Partial<DocumentItem>) => {
              await onDocumentUpdated(selectedDocument.id, updates);
            }
            : undefined
        }
      />
    );
  }

  if (selectedCardId) {
    return <CardPane selectedCardId={selectedCardId} onCardUpdated={onCardUpdated} />;
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



export { RightPane };
