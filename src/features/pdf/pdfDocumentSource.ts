import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import PdfWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs?worker";

type PdfDocumentDataSource = {
  type: "data";
  data: Uint8Array;
};

type PdfDocumentUrlSource = {
  type: "url";
  url: string;
  revoke?: () => void;
};

type PdfDocumentSource = PdfDocumentDataSource | PdfDocumentUrlSource;

type PdfDocumentLoadSource = {
  data: Uint8Array;
} | {
  url: string;
};

type PdfWorkerConstructor = new (options?: WorkerOptions) => Worker;

let pdfWorkerPort: Worker | null = null;

const createPdfDocumentDataSource = (data: Uint8Array): PdfDocumentSource => ({
  type: "data",
  data,
});

const createPdfDocumentUrlSource = (url: string): PdfDocumentSource => ({
  type: "url",
  url,
});

const createPdfDocumentObjectUrlSourceFromBlob = (blob: Blob): PdfDocumentSource => {
  const url = URL.createObjectURL(blob);
  let isRevoked = false;

  const revoke = () => {
    if (isRevoked) return;
    isRevoked = true;
    URL.revokeObjectURL(url);
  };

  return {
    type: "url",
    url,
    revoke,
  };
};

const ensurePdfWorkerPort = (): void => {
  if (typeof Worker === "undefined") return;
  if (pdfjsLib.GlobalWorkerOptions.workerPort) return;

  pdfWorkerPort ??= new (PdfWorker as PdfWorkerConstructor)({ type: "module" });
  pdfjsLib.GlobalWorkerOptions.workerPort = pdfWorkerPort;
};

const readBlobArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }

      reject(new Error("PDF Blobを読み取れませんでした。"));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("PDF Blobを読み取れませんでした。")));
    reader.readAsArrayBuffer(blob);
  });
};

const createPdfDocumentDataSourceFromBlob = async (blob: Blob): Promise<PdfDocumentSource> => {
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") return createPdfDocumentObjectUrlSourceFromBlob(blob);
  return createPdfDocumentDataSource(new Uint8Array(await readBlobArrayBuffer(blob)));
};

const toPdfDocumentLoadSource = (source: PdfDocumentSource): PdfDocumentLoadSource => {
  ensurePdfWorkerPort();
  if (source.type === "data") return { data: source.data };
  return { url: source.url };
};

const releasePdfDocumentSource = (source: PdfDocumentSource | null | undefined): void => {
  if (source?.type !== "url") return;
  source.revoke?.();
};

export { createPdfDocumentDataSource, createPdfDocumentDataSourceFromBlob, createPdfDocumentUrlSource, releasePdfDocumentSource, toPdfDocumentLoadSource };
export type { PdfDocumentSource };
