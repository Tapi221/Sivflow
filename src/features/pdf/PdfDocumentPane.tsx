import { useCallback, useEffect, useState } from "react";
import { MobilePdfPages } from "./MobilePdfPages";
import { PdfPane } from "./PdfPane";
import { createPdfDocumentDataSource, createPdfDocumentUrlSource } from "./pdfDocumentSource";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { getDocumentBlob } from "@/services/documentFileStore";
import type { DocumentItem, PdfViewerState } from "@/types";
import type { PdfDocumentSource } from "./pdfDocumentSource";

type PdfDocumentPaneProps = {
  document: DocumentItem;
  onDocumentUpdate?: (updates: Partial<DocumentItem>) => Promise<void> | void;
};

const PDF_COMPACT_VIEWPORT_QUERY = "(max-width: 767px)";

const getPdfDocumentFileId = (document: Pick<Document