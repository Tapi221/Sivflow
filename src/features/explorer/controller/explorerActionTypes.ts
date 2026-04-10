import type { SelectedExplorerItem } from "@/types";
import type { ExplorerBreadcrumbContext } from "../contracts/explorerBreadcrumbContext";
import type { ExplorerRouteState } from "../contracts/explorerRouteState";

export type ExplorerAction =
  | { type: "APPLY_ROUTE_STATE"; payload: ExplorerRouteState }
  | { type: "SELECT_FOLDER"; payload: { folderId: string | null } }
  | { type: "SELECT_ITEM"; payload: { item: SelectedExplorerItem } }
  | {
      type: "SET_BREADCRUMB_CONTEXT";
      payload: { context: ExplorerBreadcrumbContext };
    }
  | { type: "INCREMENT_SECTION_LIST_TOKEN" };
