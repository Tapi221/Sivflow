import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";

export type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;

export type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;

export type PdfViewerOptions = {
  enableXfa?: boolean;
  useSystemFonts?: boolean;
  cMapUrl?: string;
  standardFontDataUrl?: string;
  opaqueCanvas?: boolean;
};

const PDFJS_ASSET_BASE_URL = "/pdfjs/";
const PDFJS_CMAP_URL = `${PDFJS_ASSET_BASE_URL}cmaps/`;
const PDFJS_STANDARD_FONT_DATA_URL = `${PDFJS_ASSET_BASE_URL}standard_fonts/`;
const PDFJS_WASM_URL = `${PDFJS_ASSET_BASE_URL}wasm/`;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const createPdfDocumentLoadOptions = (viewerOptions: PdfViewerOptions | null | undefined) => {
  return {
    enableXfa: viewerOptions?.enableXfa,
    useSystemFonts: viewerOptions?.useSystemFonts ?? true,
    cMapUrl: viewerOptions?.cMapUrl ?? PDFJS_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: viewerOptions?.standardFontDataUrl ?? PDFJS_STANDARD_FONT_DATA_URL,
    wasmUrl: PDFJS_WASM_URL,
  };
};

const loadPdfDocument = async (sourceUrl: string | null, viewerOptions: PdfViewerOptions | null | undefined): Promise<PdfDocumentProxy> => {
  const normalizedSourceUrl = sourceUrl?.trim();
  if (!normalizedSourceUrl) throw new Error("表示できるPDFソースがありません。");
  return pdfjsLib.getDocument({ ...createPdfDocumentLoadOptions(viewerOptions), url: normalizedSourceUrl }).promise;
};

export { EventBus, PDFLinkService, PDFViewer, loadPdfDocument };
