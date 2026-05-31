import { describe, expect, it } from "vitest";
import { createBlobUrl, createStorageUrl, isBase64DataUrl, isBlobUrl, isStorageUrl } from "@/types/core/branded";

describe("ブランド型", () => {
  describe("isBlobUrl", () => {
    it("有効な Blob URL なら true を返す", () => {
      expect(isBlobUrl("blob:http://localhost:5173/abc-123")).toBe(true);
      expect(isBlobUrl("blob:https://example.com/xyz-789")).toBe(true);
    });

    it("Blob URL 以外なら false を返す", () => {
      expect(isBlobUrl("https://example.com/image.jpg")).toBe(false);
      expect(isBlobUrl("data:image/png;base64,abc")).toBe(false);
      expect(isBlobUrl("file:///C:/image.jpg")).toBe(false);
    });
  });

  describe("isStorageUrl", () => {
    it("有効な Firebase Storage URL なら true を返す", () => {
      expect(
        isStorageUrl(
          "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg",
        ),
      ).toBe(true);
      expect(
        isStorageUrl("https://storage.googleapis.com/bucket/image.jpg"),
      ).toBe(true);
    });

    it("Storage URL 以外なら false を返す", () => {
      expect(isStorageUrl("http://example.com/image.jpg")).toBe(false);
      expect(isStorageUrl("blob:http://localhost:5173/abc")).toBe(false);
      expect(isStorageUrl("data:image/png;base64,abc")).toBe(false);
    });
  });

  describe("isBase64DataUrl", () => {
    it("有効な Base64 Data URL なら true を返す", () => {
      expect(isBase64DataUrl("data:image/png;base64,iVBORw0KG")).toBe(true);
      expect(isBase64DataUrl("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
    });

    it("Base64 URL 以外なら false を返す", () => {
      expect(isBase64DataUrl("https://example.com/image.jpg")).toBe(false);
      expect(isBase64DataUrl("blob:http://localhost:5173/abc")).toBe(false);
    });
  });

  describe("createBlobUrl", () => {
    it("有効な Blob URL から BlobUrl を作成する", () => {
      const url = "blob:http://localhost:5173/abc-123";
      const blobUrl = createBlobUrl(url);
      expect(blobUrl).toBe(url);
    });

    it("無効な Blob URL では例外を投げる", () => {
      expect(() => createBlobUrl("https://example.com/image.jpg")).toThrow(
        /Invalid BlobUrl/,
      );
      expect(() => createBlobUrl("data:image/png;base64,abc")).toThrow(
        /Invalid BlobUrl/,
      );
    });
  });

  describe("createStorageUrl", () => {
    it("有効な Storage URL から StorageUrl を作成する", () => {
      const url =
        "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg";
      const storageUrl = createStorageUrl(url);
      expect(storageUrl).toBe(url);
    });

    it("無効な Storage URL では例外を投げる", () => {
      expect(() => createStorageUrl("http://example.com/image.jpg")).toThrow(
        /Invalid StorageUrl/,
      );
      expect(() => createStorageUrl("blob:http://localhost:5173/abc")).toThrow(
        /Invalid StorageUrl/,
      );
    });
  });
});
