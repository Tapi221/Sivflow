import type { PdfViewerOptions } from "./pdfViewerTypes";

export const defaultPdfViewerOptions: PdfViewerOptions = {
  enableXfa: false,
  useSystemFonts: true,
  cMapUrl: "/pdfjs/cmaps/",
  standardFontDataUrl: "/pdfjs/standard_fonts/",
  opaqueCanvas: true,
};
