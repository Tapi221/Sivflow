import { createContext, type RefObject } from "react";

import type { PdfDocumentController } from "@/features/pdf/hooks/usePdfDocument";
import type { PdfViewerHandle } from "@/features/pdf/PdfViewer";

import type { DocumentItem, PdfPageLayoutMode } from "@/types";

export interface PdfWorkspaceDocumentContextValue {
  doc: DocumentItem;
  viewerRef: RefObject<PdfViewerHandle | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  documentController: PdfDocumentController;
  sourceUnavailable: boolean;
  localDataStatus: "idle" | "loading" | "ready" | "failed";
  opaqueCanvas: boolean;
  numPages: number;
  normalizedThumbnailOrder: number[];
  firstPageSize: { width: number; height: number } | null;
  reorderThumbnailOrder: (
    activePageNumber: number,
    overPageNumber: number,
  ) => void;
}

export interface PdfWorkspaceNavigationContextValue {
  currentPage: number;
  alignedCurrentPage: number;
  scale: number;
  fitMode: "width" | "manual";
  pageLayoutMode: PdfPageLayoutMode;
  zoomPercent: number;
  canGoToPrevPage: boolean;
  canGoToNextPage: boolean;
  setCurrentPage: (pageNumber: number) => void;
  scrollToPage: (pageNumber: number) => void;
  handleFitWidth: () => void;
  handleViewerScaleChange: (nextScale: number) => void;
  handlePageLayoutModeChange: (nextPageLayoutMode: PdfPageLayoutMode) => void;
  handleZoomPercentChange: (nextPercent: number) => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleCommitPage: (nextPage: number) => void;
}

export interface PdfWorkspaceContextValue
  extends
  PdfWorkspaceDocumentContextValue,
  PdfWorkspaceNavigationContextValue {}

export const PdfWorkspaceDocumentContext =
  createContext<PdfWorkspaceDocumentContextValue | null>(null);

export const PdfWorkspaceNavigationContext =
  createContext<PdfWorkspaceNavigationContextValue | null>(null);

export const PdfWorkspaceContext =
  createContext<PdfWorkspaceContextValue | null>(null);
