import { afterEach, describe, expect, it, vi } from "vitest";
import { createPdfDocumentDataSource, createPdfDocumentDataSourceFromBlob, releasePdfDocumentSource, toPdfDocumentLoadSource } from "@/features/pdf/pdfDocumentSource";

describe("pdfDocumentSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Blob を object URL ソースに変換する", async () => {
    const createObjectUrlMock = vi.fn(() => "blob:pdf-1");
    vi.stubGlobal("URL", { ...URL, createObjectURL: createObjectUrlMock, revokeObjectURL: vi.fn() });

    const source = await createPdfDocumentDataSourceFromBlob(new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }));

    expect(source.type).toBe("url");
    expect(toPdfDocumentLoadSource(source)).toEqual({ url: "blob:pdf-1" });
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
  });

  it("object URL ソースを解放する", async () => {
    const revokeObjectUrlMock = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:pdf-2"), revokeObjectURL: revokeObjectUrlMock });
    const source = await createPdfDocumentDataSourceFromBlob(new Blob([new Uint8Array([1])], { type: "application/pdf" }));

    releasePdfDocumentSource(source);

    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:pdf-2");
  });

  it("object URL が使えない環境では Blob を data ソースに変換する", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: undefined });

    const source = await createPdfDocumentDataSourceFromBlob(new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }));

    expect(source.type).toBe("data");
    const loadSource = toPdfDocumentLoadSource(source);
    expect("data" in loadSource ? Array.from(loadSource.data) : []).toEqual([1, 2, 3]);
  });

  it("PDF.js に渡す data は追加コピーしない", () => {
    const data = new Uint8Array([4, 5, 6]);
    const source = createPdfDocumentDataSource(data);
    const loadSource = toPdfDocumentLoadSource(source);

    expect("data" in loadSource ? loadSource.data : null).toBe(data);
  });
});
