import { describe, expect, it } from "vitest";

import { normalizeUploadedImages } from "@/domain/assets/uploadedImageNormalizer";
import { normalizeMemoryStability } from "@/domain/card/review/stability";

describe("domain-owned normalizers", () => {
  it("preserves memory stability normalization behavior", () => {
    expect(normalizeMemoryStability(0.5, null)).toBe(0.5);
    expect(normalizeMemoryStability(50, null)).toBe((50 - 5) / 95);
    expect(normalizeMemoryStability(undefined, 5)).toBeCloseTo(0.9);
  });

  it("normalizes uploaded images without depending on utils path", () => {
    const normalized = normalizeUploadedImages({
      id: "img-1",
      remote_url: "https://example.com/image.png",
      content_type: "image/png",
      size_bytes: "123",
      scale: 2,
      x: 4,
    });

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      id: "img-1",
      remoteUrl: "https://example.com/image.png",
      contentType: "image/png",
      size: 123,
      scale: 1,
      x: 0,
      status: "ready",
    });
  });
});
