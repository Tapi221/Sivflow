import { describe, it, expect, beforeEach } from "vitest";
import { blobUrlManager } from "@/utils/BlobUrlManager";

describe("BlobUrlManager テスト", () => {
  beforeEach(() => {
    // 各テスト前にクリーンアップ
    blobUrlManager.revokeAll();
  });

  it("Blob URL を生成できる", () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    const url = blobUrlManager.create(blob);

    expect(url).toMatch(/^blob:/);
    expect(blobUrlManager.getActiveCount()).toBe(1);
  });

  it("Blob URL を解放できる", () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    const url = blobUrlManager.create(blob);

    blobUrlManager.revoke(url);

    expect(blobUrlManager.getActiveCount()).toBe(0);
  });

  it("上限（20枚）を超えると最古の URL を自動解放", () => {
    const blobs = Array.from(
      { length: 25 },
      () => new Blob(["test"], { type: "text/plain" }),
    );

    blobs.forEach((blob) => {
      blobUrlManager.create(blob);
    });

    // 上限20枚を維持
    expect(blobUrlManager.getActiveCount()).toBe(20);
  });

  it("すべての Blob URL を解放できる", () => {
    const blobs = Array.from(
      { length: 10 },
      () => new Blob(["test"], { type: "text/plain" }),
    );

    blobs.forEach((blob) => {
      blobUrlManager.create(blob);
    });

    blobUrlManager.revokeAll();

    expect(blobUrlManager.getActiveCount()).toBe(0);
  });
});
