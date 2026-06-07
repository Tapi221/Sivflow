import { RightPane } from "@/components/folder/panes/RightPane";
import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";

type TreeViewMainPaneProps = {
  showMobileDetail: boolean;
  hideOnSectionList?: boolean;
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
  onDocumentUpdated: (documentId: string, updates: Partial<DocumentItem>) => Promise<void> | void;
  onRenameFolder?: (newName: string) => Promise<void>;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreate