import type { SelectedExplorerItem } from "@/types";

export type ExplorerRouteState = {
  isHomeOnlyMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
};
