import type { PdfViewerOptions } from "./pdfViewerTypes";

export const defaultPdfViewerOptions: PdfViewerOptions = {
  enableXfa: false,
  useSystemFonts: true,
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
  standardFontDataUrl: "/pdfjs/standard_fonts/",
  disableFontFace: true,
  verbosity: import.meta.env.DEV ? 5 : undefined,
  opaqueCanvas: true,
};
