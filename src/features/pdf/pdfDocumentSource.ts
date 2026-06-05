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

const toPdfDocumentLoadSource = (source: PdfDocumentSource): PdfDocumentLoadSource => {
  if (source.type === "data") return { data: source.data.slice() };
  return { url: source.url };
};

export { createPdfDocumentDataSource, createPdfDocumentUrlSource, toPdfDocumentLoadSource };
export type { PdfDocumentSource };
