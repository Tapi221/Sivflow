import type { CardSelectedItem, DocumentSelectedItem } from "../contracts/explorerSelection";

export const createCardSelectedItem = (cardId: string): CardSelectedItem => {
  return {
    type: "card",
    id: cardId,
  };
};

export const createDocumentSelectedItem = (
  documentId: string,
): DocumentSelectedItem => {
  return {
    type: "document",
    id: documentId,
  };
};
