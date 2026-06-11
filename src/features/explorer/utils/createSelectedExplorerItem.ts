import type { SelectedExplorerItem } from "@/types";



const createCardSelectedItem = (cardId: string): Extract<SelectedExplorerItem, { type: "card"; }> => ({ type: "card", id: cardId });
const createCardSetSelectedItem = (cardSetId: string): Extract<SelectedExplorerItem, { type: "cardSet"; }> => ({ type: "cardSet", id: cardSetId });
const createDocumentSelectedItem = (documentId: string): Extract<SelectedExplorerItem, { type: "document"; }> => ({ type: "document", id: documentId });



export { createCardSelectedItem, createCardSetSelectedItem, createDocumentSelectedItem };
