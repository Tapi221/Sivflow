import { afterEach, describe, expect, it } from "vitest";
import {
  cancelPdfThumbnailRenders,
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

  it("limits low priority thumbnail render jobs to a single active lane", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(2);
    const first = deferred<void>();
    const second = deferred<void>();
    const started: number[] = [];

    const firstTask = schedulePdfThumbnailRender({
      priority: 1,
      run: async () => {
        started.push(1);
        await first.promise;
      },
    });
    const secondTask = schedulePdfThumbnailRender({
      priority: 1,
      run: async () => {
        started.push(2);
        await second.promise;
      },
    });

    await Promise.resolve();
    expect(started).toEqual([1]);
    expect(getPdfThumbnailRenderQueueSnapshot()).toMatchObject({
      activeRenderCount: 1,
      pendingRenderCount: 1,
    });

    first.resolve();
    await firstTask.promise;
    await Promise.resolve();
    expect(started).toEqual([1, 2]);

    second.resolve();
    await secondTask.promise;
    restoreConcurrency();
  });

  it("allows high priority thumbnail render jobs to use the parallel lane", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(2);
    const first = deferred<void>();
    const second = deferred<void>();
    const started: number[] = [];

    const firstTask = schedulePdfThumbnailRender({
      priority: 1,
      run: async () => {
        started.push(1);
        await first.promise;
      },
    });
    const secondTask = schedulePdfThumbnailRender({
      priority: 1_100,
      run: async () => {
        started.push(2);
        await second.promise;
      },
    });

    await Promise.resolve();
    expect(started).toEqual([1, 2]);

    first.resolve();
    second.resolve();
    await Promise.all([firstTask.promise, secondTask.promise]);
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

  it("cancels pending jobs without affecting active jobs by default", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(1);
    const blocker = deferred<void>();
    const started: string[] = [];

    const activeTask = schedulePdfThumbnailRender({
      priority: 1,
      run: async () => {
        started.push("active");
        await blocker.promise;
      },
    });
    const pendingTask = schedulePdfThumbnailRender({
      priority: 1,
      run: () => {
        started.push("pending");
      },
    });

    await Promise.resolve();
    expect(cancelPdfThumbnailRenders({ maxPriority: 1 })).toBe(1);
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

  it("aborts active low priority jobs when requested", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(1);
    const started: string[] = [];

    const activeTask = schedulePdfThumbnailRender({
      priority: 1,
      run: async ({ signal }) => {
        started.push("active");
        await new Promise<void>((resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(signal.reason ?? new Error("aborted")),
            { once: true },
          );
        });
      },
    });

    await Promise.resolve();
    expect(cancelPdfThumbnailRenders({ maxPriority: 1, includeActive: true })).toBe(
      1,
    );

    try {
      await activeTask.promise;
      throw new Error("Expected active thumbnail render to be cancelled");
    } catch (errorValue) {
      expect(isPdfThumbnailRenderCancelledError(errorValue)).toBe(true);
    }

    expect(started).toEqual(["active"]);
    restoreConcurrency();
  });
});
