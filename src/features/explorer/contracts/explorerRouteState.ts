import type { SelectedExplorerItem } from "./explorerSelection";

export type ExplorerRouteState = {
  isHomeOnlyMode: boolean;
  folderId: string | null;
  selectedItem: SelectedExplorerItem;
};
