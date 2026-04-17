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
        remoteUrl: "data:image/png;base64,iVBORw0KG..." as unknown,
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
        localUrl: "data:image/png;base64,iVBORw0KG..." as unknown,
        status: "uploading",
      };

      expect(() => assertNoBase64InImage(image)).toThrow(
        ImageInvariantViolation,
      );
      expect(() => assertNoBase64InImage(image)).toThrow(
        /Base64 detected in localUrl/,
      );
    });

    it("should reject embedded base64 marker in thumbnailUrl", () => {
      const image: UploadedImage = {
        id: "test-3",
        thumbnailUrl:
          "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg?token=base64,abc123" as unknown,
        status: "ready",
      };

      expect(() => assertNoBase64InImage(image)).toThrow(
        ImageInvariantViolation,
      );
      expect(() => assertNoBase64InImage(image)).toThrow(
        /Base64 detected in thumbnailUrl/,
      );
    });

    it("should accept valid Blob URL in localUrl", () => {
      const image: UploadedImage = {
        id: "test-4",
        localUrl: "blob:http://localhost:5173/abc-123" as unknown,
        status: "uploading",
      };

      expect(() => assertNoBase64InImage(image)).not.toThrow();
    });

    it("should accept valid Storage URL in remoteUrl and thumbnailUrl", () => {
      const image: UploadedImage = {
        id: "test-5",
        remoteUrl:
          "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg" as unknown,
        thumbnailUrl:
          "https://storage.googleapis.com/bucket/thumb.jpg" as unknown,
        status: "ready",
      };

      expect(() => assertNoBase64InImage(image)).not.toThrow();
    });
  });

  describe("assertImageInvariant", () => {
    it("should pass for valid image with Storage URL", () => {
      const image: UploadedImage = {
        id: "test-6",
        remoteUrl:
          "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg" as unknown,
        status: "ready",
      };

      expect(() => assertImageInvariant(image)).not.toThrow();
    });

    it("should pass for valid image with Blob URL", () => {
      const image: UploadedImage = {
        id: "test-7",
        localUrl: "blob:http://localhost:5173/abc-123" as unknown,
        status: "uploading",
      };

      expect(() => assertImageInvariant(image)).not.toThrow();
    });

    it("should pass for valid thumbnail Storage URL", () => {
      const image: UploadedImage = {
        id: "test-8",
        thumbnailUrl:
          "https://storage.googleapis.com/bucket/thumb.jpg" as unknown,
        status: "ready",
      };

      expect(() => assertImageInvariant(image)).not.toThrow();
    });

    it("should reject invalid remoteUrl even when it is https", () => {
      const image: UploadedImage = {
        id: "test-9",
        remoteUrl: "https://example.com/image.jpg" as unknown,
        status: "ready",
      };

      expect(() => assertImageInvariant(image)).toThrow(
        ImageInvariantViolation,
      );
      expect(() => assertImageInvariant(image)).toThrow(/Invalid remoteUrl/);
    });

    it("should reject invalid thumbnailUrl even when it is https", () => {
      const image: UploadedImage = {
        id: "test-10",
        thumbnailUrl: "https://example.com/thumb.jpg" as unknown,
        status: "ready",
      };

      expect(() => assertImageInvariant(image)).toThrow(
        ImageInvariantViolation,
      );
      expect(() => assertImageInvariant(image)).toThrow(/Invalid thumbnailUrl/);
    });

    it("should reject invalid localUrl (not Blob URL)", () => {
      const image: UploadedImage = {
        id: "test-11",
        localUrl: "file:///C:/Users/image.jpg" as unknown,
        status: "uploading",
      };

      expect(() => assertImageInvariant(image)).toThrow(
        ImageInvariantViolation,
      );
    });

    it("should reject embedded base64 marker in remoteUrl", () => {
      const image: UploadedImage = {
        id: "test-12",
        remoteUrl:
          "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg?payload=base64,abc123" as unknown,
        status: "ready",
      };

      expect(() => assertImageInvariant(image)).toThrow(
        ImageInvariantViolation,
      );
      expect(() => assertImageInvariant(image)).toThrow(
        /Base64 detected in remoteUrl/,
      );
    });
  });
});
