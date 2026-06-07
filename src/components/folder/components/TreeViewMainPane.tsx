import { RightPane } from "@/components/folder/panes/RightPane";
import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";

interface TreeViewMainPaneProps {
  showMobileDetail: boolean;
  hideOnSectionList?: boolean;
  selectedItem: SelectedExplorerItem;
  selectedCardId: string | null;
  selectedDocument: DocumentItem | null;
  selectedFolderId