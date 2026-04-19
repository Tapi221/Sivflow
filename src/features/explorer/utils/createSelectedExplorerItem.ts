import type { SelectedExplorerItem } from "@/types";

export const createCardSelectedItem = (
  cardId: string,
): Extract<SelectedExplorerItem, { type: "card" }> => ({
  type: "card",
  id: cardId,
});

export const createCardSetSelectedItem = (
  cardSetId: string,
): Extract<SelectedExplorerItem, { type: "cardSet" }> => ({
  type: "cardSet",
  id: cardSetId,
});

export const createDocumentSelectedItem = (
  documentId: string,
): Extract<SelectedExplorerItem, { type: "document" }> => ({
  type: "document",
  id: documentId,
});
