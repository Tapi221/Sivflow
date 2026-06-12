import type { Card, CardSet, DocumentItem } from "@/types";



const resolveDocumentTabTitle = (document: DocumentItem): string => {
  const title = document.title?.trim();
  if (title) return title;

  const fileName = document.fileName?.trim();
  if (fileName) return fileName;

  return "無題のPDF";
};
const resolveCardSetTabTitle = (cardSet: CardSet): string => {
  const name = cardSet.name?.trim();
  return name ?? "無題のセット";
};
const resolveCardTabTitle = (card: Card): string => {
  const title = card.title?.trim();
  if (title) return title;

  const questionNumber = card.questionNumber?.trim();
  if (questionNumber) return questionNumber;

  return "無題のカード";
};



export { resolveDocumentTabTitle, resolveCardSetTabTitle, resolveCardTabTitle };
