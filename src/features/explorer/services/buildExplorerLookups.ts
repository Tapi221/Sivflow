import type { Card, DocumentItem, Folder } from "@/types";

export const buildFolderById = (folders: Folder[]) =>
  new Map<string, Folder>(
    folders.map((folder): [string, Folder] => [folder.id, folder]),
  );

export const buildCardById = (cards: Card[]) =>
  new Map<string, Card>(cards.map((card): [string, Card] => [card.id, card]));

export const buildDocumentById = (documents: DocumentItem[]) => {
  const map = new Map<string, DocumentItem>();

  for (const documentItem of documents) {
    const key = documentItem.id || documentItem.documentId;

    if (key) {
      map.set(key, documentItem);
    }
  }

  return map;
};
