import type {
  PdfJsTextContent,
  PdfPageSearchMatch,
} from "@/components/pdf/pdfViewerTypes";

export type PdfSearchWorkerIndexPageRequest = {
  type: "index-page";
  requestId: string;
  pageNumber: number;
  content: PdfJsTextContent;
};

export type PdfSearchWorkerSearchPageRequest = {
  type: "search-page";
  requestId: string;
  pageNumber: number;
  query: string;
};

export type PdfSearchWorkerResetRequest = {
  type: "reset";
};

export type PdfSearchWorkerRequest =
  | PdfSearchWorkerIndexPageRequest
  | PdfSearchWorkerSearchPageRequest
  | PdfSearchWorkerResetRequest;

export type PdfSearchWorkerIndexPageResponse = {
  type: "index-page:done";
  requestId: string;
  pageNumber: number;
};

export type PdfSearchWorkerSearchPageResponse = {
  type: "search-page:done";
  requestId: string;
  pageNumber: number;
  matches: PdfPageSearchMatch[];
};

export type PdfSearchWorkerErrorResponse = {
  type: "error";
  requestId: string;
  message: string;
};

export type PdfSearchWorkerResponse =
  | PdfSearchWorkerIndexPageResponse
  | PdfSearchWorkerSearchPageResponse
  | PdfSearchWorkerErrorResponse;
