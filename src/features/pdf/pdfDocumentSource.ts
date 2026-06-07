type PdfDocumentDataSource = {
  type: "data";
  data: Uint8Array;
};

type PdfDocumentUrlSource = {
  type: "url";
  url: string;
};

type PdfDocumentSource = PdfDocumentDataSource | PdfDocumentUrlSource;

type PdfDocumentLoadSource = {
  data: Uint8Array;
} | {
  url: string;
};

const createPdfDocumentDataSource = (data: Uint8Array): PdfDocumentSource => ({
  type: "data",
  data,
});

const createPdfDocumentUrlSource = (url: string): PdfDocumentSource => ({
  type: "url",
  url,
});

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
  return createPdfDocumentDataSource(new Uint8Array(await readBlobArrayBuffer(blob)));
};

const toPdfDocumentLoadSource = (source: PdfDocumentSource): PdfDocumentLoadSource => {
  if (source.type === "data") return { data: source.data.slice() };
  return { url: source.url };
};

export { createPdfDocumentDataSource, createPdfDocumentDataSourceFromBlob, createPdfDocumentUrlSource, toPdfDocumentLoadSource };
export type { PdfDocumentSource };
