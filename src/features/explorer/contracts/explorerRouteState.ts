import type { SelectedExplorerItem } from "@/types";



type ExplorerRouteState = {
  isHomeOnlyMode: boolean;
  isSectionListMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
};

export type { ExplorerRouteState };
