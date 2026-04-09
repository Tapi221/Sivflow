import type { Card, DocumentItem, Folder } from "@/types";
import { mapDocumentsToDocumentLookup } from "../mappers/mapDocumentsToDocumentLookup";

type Params = {
  folders: Folder[];
  cards: Card[];
  documents: DocumentItem[];
};

export const buildExplorerLookups = ({ folders, cards, documents }: Params) => {
  const folderById = new Map<string, Folder>(
    folders.map((folder): [string, Folder] => [folder.id, folder]),
  );

  const cardById = new Map<string, Card>(
    cards.map((card): [string, Card] => [card.id, card]),
  );

  const documentById = mapDocumentsToDocumentLookup(documents);

  return {
    folderById,
    cardById,
    documentById,
  };
};
