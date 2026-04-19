import type { SelectedExplorerItem } from "@/types";

export type ExplorerRouteState = {
  isHomeOnlyMode: boolean;
  isSectionListMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
};
