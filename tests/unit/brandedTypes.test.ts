import { describe, expect,it } from "vitest";

import {
  createBlobUrl,
  createStorageUrl,
  isBase64DataUrl,
  isBlobUrl,
  isStorageUrl,
} from "@/types/core/branded";

describe("Branded Types", () => {
  describe("isBlobUrl", () => {
    it("should return true for valid Blob URL", () => {
      expect(isBlobUrl("blob:http://localhost:5173/abc-123")).toBe(true);
      expect(isBlobUrl("blob:https://example.com/xyz-789")).toBe(true);
    });

    it("should return false for non-Blob URL", () => {
      expect(isBlobUrl("https://example.com/image.jpg")).toBe(false);
      expect(isBlobUrl("data:image/png;base64,abc")).toBe(false);
      expect(isBlobUrl("file:///C:/image.jpg")).toBe(false);
    });
  });

  describe("isStorageUrl", () => {
    it("should return true for valid Firebase Storage URL", () => {
      expect(
        isStorageUrl(
          "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg",
        ),
      ).toBe(true);
      expect(
        isStorageUrl("https://storage.googleapis.com/bucket/image.jpg"),
      ).toBe(true);
    });

    it("should return false for non-Storage URL", () => {
      expect(isStorageUrl("http://example.com/image.jpg")).toBe(false);
      expect(isStorageUrl("blob:http://localhost:5173/abc")).toBe(false);
      expect(isStorageUrl("data:image/png;base64,abc")).toBe(false);
    });
  });

  describe("isBase64DataUrl", () => {
    it("should return true for valid Base64 Data URL", () => {
      expect(isBase64DataUrl("data:image/png;base64,iVBORw0KG")).toBe(true);
      expect(isBase64DataUrl("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
    });

    it("should return false for non-Base64 URL", () => {
      expect(isBase64DataUrl("https://example.com/image.jpg")).toBe(false);
      expect(isBase64DataUrl("blob:http://localhost:5173/abc")).toBe(false);
    });
  });

  describe("createBlobUrl", () => {
    it("should create BlobUrl for valid Blob URL", () => {
      const url = "blob:http://localhost:5173/abc-123";
      const blobUrl = createBlobUrl(url);
      expect(blobUrl).toBe(url);
    });

    it("should throw for invalid Blob URL", () => {
      expect(() => createBlobUrl("https://example.com/image.jpg")).toThrow(
        /Invalid BlobUrl/,
      );
      expect(() => createBlobUrl("data:image/png;base64,abc")).toThrow(
        /Invalid BlobUrl/,
      );
    });
  });

  describe("createStorageUrl", () => {
    it("should create StorageUrl for valid Storage URL", () => {
      const url =
        "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg";
      const storageUrl = createStorageUrl(url);
      expect(storageUrl).toBe(url);
    });

    it("should throw for invalid Storage URL", () => {
      expect(() => createStorageUrl("http://example.com/image.jpg")).toThrow(
        /Invalid StorageUrl/,
      );
      expect(() => createStorageUrl("blob:http://localhost:5173/abc")).toThrow(
        /Invalid StorageUrl/,
      );
    });
  });
});
