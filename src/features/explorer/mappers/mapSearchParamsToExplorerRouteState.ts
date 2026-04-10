import type { ExplorerRouteState } from "../contracts/explorerRouteState";
import {
  createCardSelectedItem,
  createDocumentSelectedItem,
} from "../utils/createSelectedExplorerItem";

type Params = {
  searchParams: URLSearchParams;
  fallbackFolderId: string | null;
};

export const mapSearchParamsToExplorerRouteState = ({
  searchParams,
  fallbackFolderId,
}: Params): ExplorerRouteState => {
  const isHomeOnlyMode = searchParams.get("home") === "1";
  const queryFolderId = searchParams.get("folderId");
  const queryCardId = searchParams.get("cardId");
  const queryDocId = searchParams.get("docId");

  return {
    isHomeOnlyMode,
    selectedFolderId: isHomeOnlyMode
      ? null
      : queryFolderId ?? fallbackFolderId ?? null,
    selectedItem: isHomeOnlyMode
      ? null
      : queryCardId
        ? createCardSelectedItem(queryCardId)
        : queryDocId
          ? createDocumentSelectedItem(queryDocId)
          : null,
  };
};
