import type { DocumentItem } from "@/types";



const mapDocumentsToDocumentLookup = (documents: DocumentItem[]) => {
  const map = new Map<string, DocumentItem>();

  for (const documentItem of documents) {
    const key = documentItem.id || documentItem.documentId;

    if (key) {
      map.set(key, documentItem);
    }
  }

  return map;
};



export { mapDocumentsToDocumentLookup };
