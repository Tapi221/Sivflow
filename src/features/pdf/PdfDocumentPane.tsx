import { PdfPane } from "./PdfPane";
import type { DocumentItem } from "@/types";

type PdfDocumentPaneProps = {
  document: DocumentItem;
  onDocumentUpdate?: (updates: Partial<DocumentItem>) => Promise<void> | void;
};

const PdfDocumentPane = ({ document, onDocumentUpdate }: PdfDocumentPaneProps) => {
  return <PdfPane document={document} onDocumentUpdate={onDocumentUpdate} />;
};

export { PdfDocument