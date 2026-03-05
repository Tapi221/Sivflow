import { describe, it, expect } from "vitest";
import {
  assertImageInvariant,
  assertNoBase64InImage,
  ImageInvariantViolation,
} from "@/utils/imageAssertions";
import type { UploadedImage } from "@/types";

describe("Image Invariants", () => {
  describe("assertNoBase64InImage", () => {
    it("should reject Base64 in remoteUrl", () => {
      const image: UploadedImage = {
        id: "test-1",
        remoteUrl: "data:image/png;base64,iVBORw0KG..." as any,
        status: "ready",
      };

      expect(() => assertNoBase64InImage(image)).toThrow(
        ImageInvariantViolation,
      );
      expect(() => assertNoBase64InImage(image)).toThrow(
        /Base64 detected in remoteUrl/,
      );
    });

    it("should reject Base64 in localUrl", () => {
      const image: UploadedImage = {
        id: "test-2",
        localUrl: "data:image/png;base64,iVBORw0KG..." as any,
        status: "uploading",
      };

      expect(() => assertNoBase64InImage(image)).toThrow(
        ImageInvariantViolation,
      );
      expect(() => assertNoBase64InImage(image)).toThrow(
        /Base64 detected in localUrl/,
      );
    });

    it("should accept valid Blob URL in localUrl", () => {
      const image: UploadedImage = {
        id: "test-3",
        localUrl: "blob:http://localhost:5173/abc-123" as any,
        status: "uploading",
      };

      expect(() => assertNoBase64InImage(image)).not.toThrow();
    });

    it("should accept valid Storage URL in remoteUrl", () => {
      const image: UploadedImage = {
        id: "test-4",
        remoteUrl:
          "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg" as any,
        status: "ready",
      };

      expect(() => assertNoBase64InImage(image)).not.toThrow();
    });
  });

  describe("assertImageInvariant", () => {
    it("should pass for valid image with Storage URL", () => {
      const image: UploadedImage = {
        id: "test-5",
        remoteUrl:
          "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg" as any,
        status: "ready",
      };

      expect(() => assertImageInvariant(image)).not.toThrow();
    });

    it("should pass for valid image with Blob URL", () => {
      const image: UploadedImage = {
        id: "test-6",
        localUrl: "blob:http://localhost:5173/abc-123" as any,
        status: "uploading",
      };

      expect(() => assertImageInvariant(image)).not.toThrow();
    });

    it("should reject invalid remoteUrl (not HTTPS)", () => {
      const image: UploadedImage = {
        id: "test-7",
        remoteUrl: "http://example.com/image.jpg" as any,
        status: "ready",
      };

      expect(() => assertImageInvariant(image)).toThrow(
        ImageInvariantViolation,
      );
    });

    it("should reject invalid localUrl (not Blob URL)", () => {
      const image: UploadedImage = {
        id: "test-8",
        localUrl: "file:///C:/Users/image.jpg" as any,
        status: "uploading",
      };

      expect(() => assertImageInvariant(image)).toThrow(
        ImageInvariantViolation,
      );
    });
  });
});
