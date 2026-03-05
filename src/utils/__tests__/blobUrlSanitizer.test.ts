import { describe, expect, it } from "vitest";
import { isBlobUrl, sanitizeBlobUrlsDeep } from "../blobUrlSanitizer";

type SanitizedSample = {
  questionBlocks: Array<{ images: Array<{ localUrl: string | null }> }>;
  answer: { image: { url: string | null } };
};

type SanitizedWithTime = {
  updatedAt: Date;
  createdAt: { seconds: number; nanoseconds: number; toDate: () => Date };
  nested: { url: string | null };
};

describe("blobUrlSanitizer", () => {
  it("detects blob url string", () => {
    expect(isBlobUrl("blob:http://localhost/test")).toBe(true);
    expect(isBlobUrl("https://example.com/image.png")).toBe(false);
  });

  it("sanitizes nested blob urls and returns fix paths", () => {
    const input = {
      id: "card-1",
      questionBlocks: [
        {
          images: [
            {
              localUrl: "blob:http://localhost/a",
              remoteUrl: "https://example.com/a.png",
            },
          ],
        },
      ],
      answer: {
        image: {
          url: "blob:http://localhost/b",
        },
      },
    };

    const result = sanitizeBlobUrlsDeep(input);

    expect(result.changed).toBe(true);
    expect(result.fixes.length).toBe(2);
    expect(result.fixes.map((f) => f.path)).toContain(
      "questionBlocks[0].images[0].localUrl",
    );
    expect(result.fixes.map((f) => f.path)).toContain("answer.image.url");
    const value = result.value as unknown as SanitizedSample;
    expect(value.questionBlocks[0].images[0].localUrl).toBeNull();
    expect(value.answer.image.url).toBeNull();
  });

  it("preserves Date and toDate-capable objects", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    const timestampLike = {
      seconds: 1,
      nanoseconds: 2,
      toDate: () => new Date("2026-02-01T00:00:00.000Z"),
    };
    const input = {
      updatedAt: date,
      createdAt: timestampLike,
      nested: { url: "blob:http://localhost/c" },
    };

    const result = sanitizeBlobUrlsDeep(input);

    expect(result.changed).toBe(true);
    const value = result.value as unknown as SanitizedWithTime;
    expect(value.updatedAt).toBe(date);
    expect(value.createdAt).toBe(timestampLike);
    expect(value.nested.url).toBeNull();
  });
});
