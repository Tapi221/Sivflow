import type { ExplorerBreadcrumbContext } from "./explorerBreadcrumbContext";
import type { SelectedExplorerItem } from "./explorerSelection";

export type ExplorerControllerState = {
  isHomeOnlyMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  folderSelectionNonce: number;
  navigateToSectionListToken: number;
  explorerBreadcrumbContext: ExplorerBreadcrumbContext;
};
