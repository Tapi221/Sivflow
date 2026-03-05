import { describe, it, expect, vi } from "vitest";
import { strictValidateBeforeSave } from "@/utils/imageValidation";
import type { UploadedImage } from "@/types";

describe("UploadedImage 不変条件テスト", () => {
  it("remoteUrl は https:// で始まる必要がある", () => {
    const validImage: UploadedImage = {
      id: "test-1",
      remoteUrl: "https://firebasestorage.googleapis.com/...",
      localUrl: null,
      status: "ready",
      source: "cloud",
    };

    expect(() => strictValidateBeforeSave(validImage)).not.toThrow();
  });

  it("remoteUrl に Base64 (data:) が含まれてはならない", () => {
    const invalidImage: UploadedImage = {
      id: "test-2",
      remoteUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
      localUrl: null,
      status: "ready",
      source: "cloud",
    };

    expect(() => strictValidateBeforeSave(invalidImage)).toThrow(
      "Base64 in remoteUrl",
    );
  });

  it("Base64 の MIME 型チェック", () => {
    const invalidImage: UploadedImage = {
      id: "test-3",
      remoteUrl: "https://example.com/image.jpg?data=base64,abc123",
      localUrl: null,
      status: "ready",
      source: "cloud",
    };

    expect(() => strictValidateBeforeSave(invalidImage)).toThrow(
      "Base64 encoding detected",
    );
  });

  it("localUrl は blob: で始まる必要がある", () => {
    const validImage: UploadedImage = {
      id: "test-4",
      remoteUrl: null,
      localUrl: "blob:http://localhost:5173/abc-123",
      status: "uploading",
      source: "local_fallback",
    };

    expect(() => strictValidateBeforeSave(validImage)).not.toThrow();
  });

  it("localUrl に Base64 (data:) が含まれてはならない", () => {
    const invalidImage: UploadedImage = {
      id: "test-5",
      remoteUrl: null,
      localUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
      status: "uploading",
      source: "local_fallback",
    };

    expect(() => strictValidateBeforeSave(invalidImage)).toThrow(
      "Base64 in localUrl",
    );
  });

  it("remoteUrl と localUrl が両方 null でも問題ない", () => {
    const validImage: UploadedImage = {
      id: "test-6",
      remoteUrl: null,
      localUrl: null,
      status: "pending",
    };

    expect(() => strictValidateBeforeSave(validImage)).not.toThrow();
  });
});
