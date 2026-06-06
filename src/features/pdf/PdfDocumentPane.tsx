import type { DocumentItem } from "@/types";
import { PdfPane } from "./PdfPane";
import { createPdfDocumentUrlSource } from "./pdfDocumentSource";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";

type PdfDocumentPaneProps = { document: DocumentItem; onDocumentUpdate?: (updates: Partial<DocumentItem>) => Promise<void> | void };

function PdfDocumentPane({ document, onDocumentUpdate }: PdfDocumentPaneProps) {
  const url = resolvePdfDocumentSourceUrl(document);
  return <PdfPane source={url ?