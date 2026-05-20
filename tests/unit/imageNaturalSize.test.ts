import { afterEach, describe, expect, it, vi } from "vitest";

import { loadImageNaturalSize } from "@/utils/uploaded-image/naturalSize";

type MockImageOptions = {
  naturalWidth?: number;
  naturalHeight?: number;
  shouldError?: boolean;
};

function stubImage(options: MockImageOptions) {
  class MockImage {
    onload: ((...args: unknown[]) => unknown) | null = null;
    onerror: ((...args: unknown[]) => unknown) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    complete = false;

    set src(_value: string) {
      if (options.shouldError) {
        queueMicrotask(() => {
          this.complete = true;
          this.onerror?.(new Event("error"));
        });
        return;
      }

      this.naturalWidth = options.naturalWidth ?? 0;
      this.naturalHeight = options.naturalHeight ?? 0;
      this.complete = true;
      queueMicrotask(() => {
        this.onload?.(new Event("load"));
      });
    }
  }

  vi.stubGlobal("Image", MockImage as unknown as typeof Image);
}

describe("loadImageNaturalSize", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null for an empty source", async () => {
    await expect(loadImageNaturalSize("")).resolves.toBeNull();
  });

  it("returns natural size when image loading succeeds", async () => {
    stubImage({ naturalWidth: 1280, naturalHeight: 720 });

    await expect(loadImageNaturalSize("blob:test")).resolves.toEqual({
      naturalW: 1280,
      naturalH: 720,
    });
  });

  it("returns null when image loading fails", async () => {
    stubImage({ shouldError: true });

    await expect(loadImageNaturalSize("blob:test")).resolves.toBeNull();
  });
});
