import type { SelectedExplorerItem } from "@/types";
import type { ExplorerBreadcrumbContext } from "./explorerBreadcrumbContext";

export type ExplorerControllerState = {
  isHomeOnlyMode: boolean;
  isSectionListMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  folderSelectionNonce: number;
  navigateToSectionListToken: number;
  explorerBreadcrumbContext: ExplorerBreadcrumbContext;
};
