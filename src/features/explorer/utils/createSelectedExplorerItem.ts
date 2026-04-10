import type { SelectedExplorerItem } from "@/types";

export const createCardSelectedItem = (
  cardId: string,
): Extract<SelectedExplorerItem, { type: "card" }> => ({
  type: "card",
  id: cardId,
});

export const createDocumentSelectedItem = (
  documentId: string,
): Extract<SelectedExplorerItem, { type: "document" }> => ({
  type: "document",
  id: documentId,
});
