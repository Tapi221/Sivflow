import type { SelectedExplorerItem } from "@/types";
import type { ExplorerBreadcrumbContext } from "./explorerBreadcrumbContext";



type ExplorerControllerState = {
  isHomeOnlyMode: boolean;
  isSectionListMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  folderSelectionNonce: number;
  navigateToSectionListToken: number;
  explorerBreadcrumbContext: ExplorerBreadcrumbContext;
};

export type { ExplorerControllerState };
