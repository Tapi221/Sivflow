import { afterEach, describe, expect, it } from "vitest";
import {
  clearPdfThumbnailRenderQueueForTests,
  configurePdfThumbnailRenderQueueForTests,
  getPdfThumbnailRenderQueueSnapshot,
  isPdfThumbnailRenderCancelledError,
  schedulePdfThumbnailRender,
} from "@/components/pdf/pdfThumbnailRenderQueue";

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
};

describe("pdfThumbnailRenderQueue", () => {
  afterEach(() => {
    clearPdfThumbnailRenderQueueForTests();
    configurePdfThumbnailRenderQueueForTests(2)();
  });

  it("limits concurrent thumbnail render jobs", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(2);
    const first = deferred<void>();
    const second = deferred<void>();
    const third = deferred<void>();
    const started: number[] = [];

    const firstTask = schedulePdfThumbnailRender({
      run: async () => {
        started.push(1);
        await first.promise;
      },
    });
    const secondTask = schedulePdfThumbnailRender({
      run: async () => {
        started.push(2);
        await second.promise;
      },
    });
    const thirdTask = schedulePdfThumbnailRender({
      run: async () => {
        started.push(3);
        await third.promise;
      },
    });

    await Promise.resolve();
    expect(started).toEqual([1, 2]);
    expect(getPdfThumbnailRenderQueueSnapshot()).toMatchObject({
      activeRenderCount: 2,
      pendingRenderCount: 1,
    });

    first.resolve();
    await firstTask.promise;
    await Promise.resolve();
    expect(started).toEqual([1, 2, 3]);

    second.resolve();
    third.resolve();
    await Promise.all([secondTask.promise, thirdTask.promise]);
    restoreConcurrency();
  });

  it("starts higher priority pending jobs first", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(1);
    const blocker = deferred<void>();
    const started: string[] = [];

    const activeTask = schedulePdfThumbnailRender({
      priority: 0,
      run: async () => {
        started.push("active");
        await blocker.promise;
      },
    });
    const lowTask = schedulePdfThumbnailRender({
      priority: 1,
      run: () => {
        started.push("low");
      },
    });
    const highTask = schedulePdfThumbnailRender({
      priority: 100,
      run: () => {
        started.push("high");
      },
    });

    await Promise.resolve();
    expect(started).toEqual(["active"]);

    blocker.resolve();
    await activeTask.promise;
    await highTask.promise;
    await lowTask.promise;
    expect(started).toEqual(["active", "high", "low"]);
    restoreConcurrency();
  });

  it("cancels pending jobs without affecting active jobs", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(1);
    const blocker = deferred<void>();
    const started: string[] = [];

    const activeTask = schedulePdfThumbnailRender({
      run: async () => {
        started.push("active");
        await blocker.promise;
      },
    });
    const pendingTask = schedulePdfThumbnailRender({
      run: () => {
        started.push("pending");
      },
    });

    await Promise.resolve();
    pendingTask.cancel();
    blocker.resolve();
    await activeTask.promise;

    try {
      await pendingTask.promise;
      throw new Error("Expected pending thumbnail render to be cancelled");
    } catch (errorValue) {
      expect(isPdfThumbnailRenderCancelledError(errorValue)).toBe(true);
    }

    expect(started).toEqual(["active"]);
    restoreConcurrency();
  });
});
