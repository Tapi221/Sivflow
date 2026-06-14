import type { ExplorerBreadcrumbContext } from "@/features/breadcrumbs/breadcrumbs.types";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import type { SelectedExplorerItem } from "@/types";



type ExplorerAction = | { type: "APPLY_ROUTE_STATE"; payload: ExplorerRouteState; }
  | { type: "SELECT_FOLDER"; payload: { folderId: string | null; }; }
  | { type: "SELECT_ITEM"; payload: { item: SelectedExplorerItem; }; }
  | {
    type: "SET_BREADCRUMB_CONTEXT";
    payload: { context: ExplorerBreadcrumbContext; };
  }
  | { type: "INCREMENT_SECTION_LIST_TOKEN"; };

export type { ExplorerAction };
