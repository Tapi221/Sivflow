import { describe, expect, it } from "vitest";
import { createPdfDocumentDataSource, createPdfDocumentDataSourceFromBlob, toPdfDocumentLoadSource } from "@/features/pdf/pdfDocumentSource";

describe("pdfDocumentSource", () => {
  it("Blob を PDF.js の data ソースに変換する", async () => {
    const source = await createPdfDocumentDataSourceFromBlob(
      new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }),
    );

    expect(source.type).toBe("data");
    const loadSource = toPdfDocumentLoadSource(source);
    expect("data" in loadSource ? Array.from(loadSource.data) : []).toEqual([1, 2, 3]);
  });

  it("PDF.js に渡す data はコピーして元データを保持する", () => {
    const source = createPdfDocumentDataSource(new Uint8Array([4, 5, 6]));
    const firstLoadSource = toPdfDocumentLoadSource(source);

    if ("data" in firstLoadSource) {
      firstLoadSource.data[0] = 9;
    }

    const secondLoadSource = toPdfDocumentLoadSource(source);
    expect("data" in secondLoadSource ? Array.from(secondLoadSource.data) : []).toEqual([4, 5, 6]);
  });
});
