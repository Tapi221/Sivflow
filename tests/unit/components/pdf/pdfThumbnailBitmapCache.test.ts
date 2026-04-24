// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCachedPdfThumbnailBitmaps,
  getCachedPdfThumbnailBitmap,
  getPdfThumbnailBitmapCacheSnapshot,
  setCachedPdfThumbnailBitmap,
} from "@/components/pdf/pdfThumbnailBitmapCache";

describe("pdfThumbnailBitmapCache", () => {
  afterEach(() => {
    clearCachedPdfThumbnailBitmaps();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("stores cached thumbnail bitmaps by exact backing-store size", async () => {
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = 12;
    sourceCanvas.height = 16;
    const bitmap = {
      width: 12,
      height: 16,
      close: vi.fn(),
    } as unknown as ImageBitmap;
    const createImageBitmapMock = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", createImageBitmapMock);

    await setCachedPdfThumbnailBitmap({
      key: "doc::1::thumb",
      documentKey: "doc",
      canvas: sourceCanvas,
    });

    expect(createImageBitmapMock).toHaveBeenCalledWith(sourceCanvas);
    expect(
      getCachedPdfThumbnailBitmap({
        key: "doc::1::thumb",
        width: 12,
        height: 16,
      })?.bitmap,
    ).toBe(bitmap);
    expect(
      getCachedPdfThumbnailBitmap({
        key: "doc::1::thumb",
        width: 24,
        height: 16,
      }),
    ).toBeNull();
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it("can clear only one document identity", async () => {
    const createImageBitmapMock = vi
      .fn()
      .mockResolvedValueOnce({ width: 1, height: 1, close: vi.fn() })
      .mockResolvedValueOnce({ width: 1, height: 1, close: vi.fn() });
    vi.stubGlobal("createImageBitmap", createImageBitmapMock);

    const firstCanvas = document.createElement("canvas");
    firstCanvas.width = 1;
    firstCanvas.height = 1;
    const secondCanvas = document.createElement("canvas");
    secondCanvas.width = 1;
    secondCanvas.height = 1;

    await setCachedPdfThumbnailBitmap({
      key: "doc-a::1",
      documentKey: "doc-a",
      canvas: firstCanvas,
    });
    await setCachedPdfThumbnailBitmap({
      key: "doc-b::1",
      documentKey: "doc-b",
      canvas: secondCanvas,
    });

    clearCachedPdfThumbnailBitmaps("doc-a");

    expect(
      getCachedPdfThumbnailBitmap({ key: "doc-a::1", width: 1, height: 1 }),
    ).toBeNull();
    expect(
      getCachedPdfThumbnailBitmap({ key: "doc-b::1", width: 1, height: 1 }),
    ).not.toBeNull();
    expect(getPdfThumbnailBitmapCacheSnapshot().entryCount).toBe(1);
  });
});
