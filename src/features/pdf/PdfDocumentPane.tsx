import { useEffect, useMemo, useState } from "react";
import { MobilePdfPages } from "./MobilePdfPages";
import { PdfPane } from "./PdfPane";
import { createPdfDocumentDataSource, createPdfDocumentUrlSource } from "./pdfDocumentSource";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
import { useAuthSession } from "@/contexts/AuthContext";
import { getDocumentBlob } from "@/services/documentFileStore";
import type { DocumentItem, PdfViewerState } from "@/types";
import type { PdfDocumentSource } from "./pdfDocumentSource";

type PdfDocumentPaneProps = {
  document: DocumentItem;
  className?: string;
  onDocumentUpdate?: (updates: Partial<DocumentItem>) => Promise<void> | void;
};

type LocalPdfSourceState = {
  isResolved: boolean;
  source: PdfDocumentSource | null;
};

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

const MOBILE_PDF_VIEWPORT_MEDIA_QUERY = "(max-width: 767px)";
const LOCAL_PDF_SOURCE_TIMEOUT_MS = 3000;

const createPendingLocalPdfSourceState = (): LocalPdfSourceState => ({
  isResolved: false,
  source: null,
});

const createResolvedLocalPdfSourceState = (source: PdfDocumentSource | null): LocalPdfSourceState => ({
  isResolved: true,
  source,
});

const getUniqueValues = (values: Array<string | null | undefined>): string[] => {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
};

const resolveDocumentFileIds = (document: Pick<DocumentItem, "id" | "localFileId">): string[] => {
  return getUniqueValues([document.localFileId, document.id]);
};

const resolveDocumentBlobUserIds = (documentUserId: string | null | undefined, currentUserId: string | null | undefined): Array<string | undefined> => {
  const userIds = getUniqueValues([documentUserId, currentUserId]);
  return [...userIds, undefined];
};

const get