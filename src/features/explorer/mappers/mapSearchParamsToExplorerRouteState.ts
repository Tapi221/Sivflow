import type { ExplorerRouteState } from "../contracts/explorerRouteState";
import {
  createCardSelectedItem,
  createDocumentSelectedItem,
} from "../utils/createSelectedExplorerItem";

export const mapSearchParamsToExplorerRouteState = (
  searchParams: URLSearchParams,
): ExplorerRouteState => {
  const isHomeOnlyMode = searchParams.get("home") === "1";
  const folderId = isHomeOnlyMode ? null : searchParams.get("folderId");

  const cardId = searchParams.get("cardId");
  const docId = searchParams.get("docId");

  const selectedItem = isHomeOnlyMode
    ? null
    : cardId
      ? createCardSelectedItem(cardId)
      : docId
        ? createDocumentSelectedItem(docId)
        : null;

  return {
    isHomeOnlyMode,
    folderId,
    selectedItem,
  };
};
