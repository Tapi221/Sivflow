import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import PdfWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs?worker";



type PdfDocumentDataSource = {
  type: "data";
  data: Uint8Array;
};
type PdfDocumentUrlSource = {
  type: "url";
  locality: "local" | "remote";
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
const scheduledSourceReleaseTimers = new WeakMap<PdfDocumentUrlSource, ReturnType<typeof globalThis.setTimeout>>();



const getPdfDocumentUrlSourceLocality = (url: string): PdfDocumentUrlSource["locality"] => {
  return url.startsWith("blob:") ? "local" : "remote";
};
const createPdfDocumentDataSource = (data: Uint8Array): PdfDocumentSource => ({
  type: "data",
  data,
});
const createPdfDocumentUrlSource = (url: string): PdfDocumentSource => ({
  type: "url",
  locality: getPdfDocumentUrlSourceLocality(url),
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
    locality: "local",
    url,
    revoke,
  };
};
const tryCreatePdfDocumentObjectUrlSourceFromBlob = (blob: Blob): PdfDocumentSource | null => {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;

  try {
    return createPdfDocumentObjectUrlSourceFromBlob(blob);
  } catch {
    return null;
  }
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
  const objectUrlSource = tryCreatePdfDocumentObjectUrlSourceFromBlob(blob);
  if (objectUrlSource) return objectUrlSource;
  return createPdfDocumentDataSource(new Uint8Array(await readBlobArrayBuffer(blob)));
};
const toPdfDocumentLoadSource = (source: PdfDocumentSource): PdfDocumentLoadSource => {
  ensurePdfWorkerPort();
  if (source.type === "data") return { data: source.data };
  return { url: source.url };
};
const retainPdfDocumentSource = (source: PdfDocumentSource | null | undefined): void => {
  if (source?.type !== "url") return;
  const releaseTimer = scheduledSourceReleaseTimers.get(source);
  if (!releaseTimer) return;
  globalThis.clearTimeout(releaseTimer);
  scheduledSourceReleaseTimers.delete(source);
};
const releasePdfDocumentSource = (source: PdfDocumentSource | null | undefined): void => {
  if (source?.type !== "url") return;
  retainPdfDocumentSource(source);
  source.revoke?.();
};
const releasePdfDocumentSourceSoon = (source: PdfDocumentSource | null | undefined): void => {
  if (source?.type !== "url") {
    releasePdfDocumentSource(source);
    return;
  }

  if (scheduledSourceReleaseTimers.has(source)) return;
  const releaseTimer = globalThis.setTimeout(() => {
    scheduledSourceReleaseTimers.delete(source);
    releasePdfDocumentSource(source);
  }, 0);
  scheduledSourceReleaseTimers.set(source, releaseTimer);
};



export { createPdfDocumentDataSource, createPdfDocumentDataSourceFromBlob, createPdfDocumentUrlSource, releasePdfDocumentSource, releasePdfDocumentSourceSoon, retainPdfDocumentSource, toPdfDocumentLoadSource };


export type { PdfDocumentSource };
