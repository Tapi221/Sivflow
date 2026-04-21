
import { pdfjsLib } from "@/lib/pdfjs";

export type PdfScaleChangeSource = "wheel" | "gesture" | "reset";

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

export interface PdfScrollToPageOptions {
  behavior?: ScrollBehavior;
}

export interface PdfViewerHandle {
  scrollToPage: (page: number, options?: PdfScrollToPageOptions) => void;
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

export interface PdfJsReference {
  num: number;
  gen: number;
}

export type PdfJsOutlineDestination =
  | string
  | [PdfJsReference | number | null, ...unknown[]]
  | null;

export interface PdfJsOutlineItem {
  title: string;
  dest?: PdfJsOutlineDestination;
  items?: PdfJsOutlineItem[];
}

export interface PdfJsPage {
  getViewport: (params: { scale: number }) => PdfJsViewport;
  getTextContent: () => Promise<PdfJsTextContent>;
  cleanup?: (resetStats?: boolean) => boolean;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfJsViewport;
    intent: "display";
  }) => PdfJsRenderTask;
}

export interface PdfJsPageLease {
  page: PdfJsPage;
  release: () => void;
}

export interface PdfJsDocument {
  numPages: number;
  fingerprints?: Array<string | null>;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
  getOutline?: () => Promise<PdfJsOutlineItem[] | null>;
  getDestination?: (id: string) => Promise<PdfJsOutlineDestination>;
  getPageIndex?: (ref: PdfJsReference) => Promise<number>;
  cleanup?: (keepLoadedFonts?: boolean) => Promise<void>;
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

export interface PdfErrorDetails {
  name: string | null;
  message: string;
  code: string | null;
  stack: string | null;
}

type ErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  stack?: unknown;
};

const PDF_ABORT_ERROR_NAMES = new Set([
  "AbortError",
  "RenderingCancelledException",
]);

const PDF_ABORT_ERROR_MESSAGE_PATTERNS = [
  /rendering cancelled/i,
  /rendering canceled/i,
  /cancelled/i,
  /canceled/i,
  /aborted/i,
];

const readStringField = (
  value: unknown,
  field: keyof ErrorLike,
): string | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = (value as ErrorLike)[field];
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null;
};

export const getPdfDocument = (
  params: PdfJsGetDocumentParams,
): PdfJsLoadingTask => pdfjsLib.getDocument(params) as PdfJsLoadingTask;

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

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

export const getPdfErrorDetails = (error: unknown): PdfErrorDetails => {
  const name =
    error instanceof Error
      ? error.name || null
      : readStringField(error, "name");
  const message = getErrorMessage(error);
  const code = readStringField(error, "code");
  const stack =
    error instanceof Error
      ? (error.stack ?? null)
      : readStringField(error, "stack");

  return {
    name,
    message,
    code,
    stack,
  };
};

export const isPdfAbortError = (error: unknown): boolean => {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    if (error.name === "AbortError") {
      return true;
    }
  }

  const details = getPdfErrorDetails(error);

  if (details.name && PDF_ABORT_ERROR_NAMES.has(details.name)) {
    return true;
  }

  if (details.code && PDF_ABORT_ERROR_NAMES.has(details.code)) {
    return true;
  }

  return PDF_ABORT_ERROR_MESSAGE_PATTERNS.some((pattern) => {
    return pattern.test(details.message);
  });
};

export const isPdfTextItem = (
  item: PdfJsTextItem | PdfJsTextMarkedContent,
): item is PdfJsTextItem => typeof (item as PdfJsTextItem).str === "string";

export const isPdfJsReference = (value: unknown): value is PdfJsReference => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PdfJsReference>;
  return (
    typeof candidate.num === "number" &&
    Number.isFinite(candidate.num) &&
    typeof candidate.gen === "number" &&
    Number.isFinite(candidate.gen)
  );
};

export const destroyPdfResource = (
  resource: { destroy?: () => void | Promise<void> } | null | undefined,
) => {
  try {
    void resource?.destroy?.();
  } catch {
    // noop
  }
};

export const disposePdfDocumentResource = (
  resource:
    | {
        cleanup?: (keepLoadedFonts?: boolean) => void | Promise<void>;
        destroy?: () => void | Promise<void>;
      }
    | null
    | undefined,
) => {
  void (async () => {
    try {
      await resource?.cleanup?.(false);
    } catch {
      // noop
    }

    try {
      await resource?.destroy?.();
    } catch {
      // noop
    }
  })();
};
