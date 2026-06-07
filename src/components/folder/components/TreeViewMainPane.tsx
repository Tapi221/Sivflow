import { RightPane } from "@/components/folder/panes/RightPane";
import { cn } from "@/lib/utils";
import type { DocumentItem, SelectedExplorerItem } from "@/types";

type TreeViewMainPaneProps = {
  showMobileDetail: boolean;
  hideOnSectionList?: boolean;
  selectedItem: SelectedExplorerItem;
  selectedCardId: string | null;
  selectedDocument: DocumentItem | null;
  selectedFolderId: string | null;
  selectedFolderName: string;
  folderCards: unknown[];
  onCardUpdated: