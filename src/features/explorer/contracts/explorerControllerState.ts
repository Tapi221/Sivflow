import type { ExplorerBreadcrumbContext } from "@/features/explorer/contracts/explorerBreadcrumbContext";
import type { SelectedExplorerItem } from "@/types";

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
