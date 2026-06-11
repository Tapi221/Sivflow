import { describe, expect, it } from "vitest";
import type { UploadedImage } from "@/types";
import { assertImageInvariant, assertNoBase64InImage, ImageInvariantViolation } from "@/utils/imageAssertions";

describe("画像不変条件", () => {
  describe("assertNoBase64InImage", () => {
    it("remoteUrl 内の Base64 を拒否する", () => {
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

    it("localUrl 内の Base64 を拒否する", () => {
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

    it("thumbnailUrl 内の埋め込み Base64 マーカーを拒否する", () => {
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

    it("localUrl の有効な Blob URL を受け入れる", () => {
      const image: UploadedImage = {
        id: "test-4",
        localUrl: "blob:http://localhost:5173/abc-123" as unknown,
        status: "uploading",
      };

      expect(() => assertNoBase64InImage(image)).not.toThrow();
    });

    it("remoteUrl と thumbnailUrl の有効な Storage URL を受け入れる", () => {
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
    it("Storage URL を持つ有効な画像を通す", () => {
      const image: UploadedImage = {
        id: "test-6",
        remoteUrl:
          "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg" as unknown,
        status: "ready",
      };

      expect(() => assertImageInvariant(image)).not.toThrow();
    });

    it("Blob URL を持つ有効な画像を通す", () => {
      const image: UploadedImage = {
        id: "test-7",
        localUrl: "blob:http://localhost:5173/abc-123" as unknown,
        status: "uploading",
      };

      expect(() => assertImageInvariant(image)).not.toThrow();
    });

    it("有効な thumbnail Storage URL を通す", () => {
      const image: UploadedImage = {
        id: "test-8",
        thumbnailUrl:
          "https://storage.googleapis.com/bucket/thumb.jpg" as unknown,
        status: "ready",
      };

      expect(() => assertImageInvariant(image)).not.toThrow();
    });

    it("https でも無効な remoteUrl は拒否する", () => {
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

    it("https でも無効な thumbnailUrl は拒否する", () => {
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

    it("Blob URL ではない無効な localUrl を拒否する", () => {
      const image: UploadedImage = {
        id: "test-11",
        localUrl: "file:///C:/Users/image.jpg" as unknown,
        status: "uploading",
      };

      expect(() => assertImageInvariant(image)).toThrow(
        ImageInvariantViolation,
      );
    });

    it("remoteUrl 内の埋め込み Base64 マーカーを拒否する", () => {
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
