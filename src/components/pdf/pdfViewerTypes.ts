import { pdfjsLib } from "@/lib/pdfjs";

export type PdfScaleChangeSource = "wheel" | "gesture";

export type PageSize = {
  width: number;
  height: number;
};

export type SourceLoadErrorKind =
  | "remote-url"
  | "blob-url"
  | "data"
  | "unknown";

export interface PdfScrollDiagnostics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  maxScrollTop: number;
  overflowY: string;
  overscrollBehaviorY: string;
  isScrollable: boolean;
  numPages: number;
  currentPage: number;
  ancestorTransforms: Array<{
    tag: string;
    className: string;
    transform: string;
  }>;
}

export interface PdfViewerHandle {
  scrollToPage: (page: number) => void;
  getScrollDiagnostics: () => PdfScrollDiagnostics | null;
  logScrollDiagnostics: () => void;
}

export interface PdfJsViewport {
  width: number;
  height: number;
  scale: number;
  transform: number[];
}

export interface PdfJsRenderTask {
  promise: Promise<void>;
  cancel?: () => void;
}

export interface PdfJsTextItem {
  str: string;
  dir?: string;
  width: number;
  height: number;
  transform: number[];
  fontName?: string;
  hasEOL?: boolean;
}

export interface PdfJsTextMarkedContent {
  type: string;
}

export interface PdfJsTextContent {
  items: Array<PdfJsTextItem | PdfJsTextMarkedContent>;
  styles?: Record<
    string,
    { fontFamily?: string; ascent?: number; descent?: number }
  >;
}

export interface PdfJsPage {
  getViewport: (params: { scale: number }) => PdfJsViewport;
  getTextContent: () => Promise<PdfJsTextContent>;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfJsViewport;
    intent: "display";
  }) => PdfJsRenderTask;
}

export interface PdfJsDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
  destroy?: () => void | Promise<void>;
}

export interface PdfJsLoadingTask {
  promise: Promise<PdfJsDocument>;
  destroy?: () => void | Promise<void>;
}

export interface PdfJsGetDocumentParams {
  data?: Uint8Array;
  url?: string;
  enableXfa?: boolean;
  useSystemFonts?: boolean;
  cMapUrl?: string;
  cMapPacked?: boolean;
  standardFontDataUrl?: string;
  disableFontFace?: boolean;
  verbosity?: number;
}

export interface PdfViewerOptions {
  enableXfa?: boolean;
  useSystemFonts?: boolean;
  cMapUrl?: string;
  cMapPacked?: boolean;
  standardFontDataUrl?: string;
  disableFontFace?: boolean;
  verbosity?: number;
  opaqueCanvas?: boolean;
}

export interface PdfViewerSourceMeta {
  url?: string | null;
  blobUrl?: string | null;
  localFileId?: string | null;
  remoteUrl?: string | null;
}

export interface PdfPageSearchMatch {
  pageNumber: number;
  itemIndex: number;
  start: number;
  end: number;
  globalIndex: number;
}

export const getPdfDocument = (
  params: PdfJsGetDocumentParams,
): PdfJsLoadingTask => pdfjsLib.getDocument(params) as PdfJsLoadingTask;

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return String(error ?? "");
};

export const isPdfTextItem = (
  item: PdfJsTextItem | PdfJsTextMarkedContent,
): item is PdfJsTextItem => typeof (item as PdfJsTextItem).str === "string";

export const destroyPdfResource = (
  resource: { destroy?: () => void | Promise<void> } | null | undefined,
) => {
  try {
    void resource?.destroy?.();
  } catch {
    // noop
  }
};
