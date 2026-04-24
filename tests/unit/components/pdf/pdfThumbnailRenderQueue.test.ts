import { afterEach, describe, expect, it } from "vitest";
import {
  cancelPendingPdfThumbnailRenders,
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

  it("limits concurrent high-priority thumbnail render jobs", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(2);
    const first = deferred<void>();
    const second = deferred<void>();
    const third = deferred<void>();
    const started: number[] = [];

    const firstTask = schedulePdfThumbnailRender({
      priority: 1_000,
      run: async () => {
        started.push(1);
        await first.promise;
      },
    });
    const secondTask = schedulePdfThumbnailRender({
      priority: 1_000,
      run: async () => {
        started.push(2);
        await second.promise;
      },
    });
    const thirdTask = schedulePdfThumbnailRender({
      priority: 1_000,
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

  it("serializes low-priority thumbnail render jobs to keep UI navigation responsive", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(2);
    const first = deferred<void>();
    const second = deferred<void>();
    const started: number[] = [];

    const firstTask = schedulePdfThumbnailRender({
      priority: 120,
      run: async () => {
        started.push(1);
        await first.promise;
      },
    });
    const secondTask = schedulePdfThumbnailRender({
      priority: 120,
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

  it("lets high-priority jobs use a second slot while a low-priority render is active", async () => {
    const restoreConcurrency = configurePdfThumbnailRenderQueueForTests(2);
    const lowBlocker = deferred<void>();
    const highBlocker = deferred<void>();
    const started: string[] = [];

    const lowTask = schedulePdfThumbnailRender({
      priority: 120,
      run: async () => {
        started.push("low");
        await lowBlocker.promise;
      },
    });
    const highTask = schedulePdfThumbnailRender({
      priority: 1_000,
      run: async () => {
        started.push("high");
        await highBlocker.promise;
      },
    });

    await Promise.resolve();
    expect(started).toEqual(["low", "high"]);
    expect(getPdfThumbnailRenderQueueSnapshot()).toMatchObject({
      activeRenderCount: 2,
      pendingRenderCount: 0,
    });

    lowBlocker.resolve();
    highBlocker.resolve();
    await Promise.all([lowTask.promise, highTask.promise]);
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

  it("bulk-cancels only pending jobs at or below the selected priority", async () => {
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
      priority: 120,
      run: () => {
        started.push("low");
      },
    });
    const highTask = schedulePdfThumbnailRender({
      priority: 1_000,
      run: () => {
        started.push("high");
      },
    });

    await Promise.resolve();
    const cancelledCount = cancelPendingPdfThumbnailRenders({ maxPriority: 700 });
    expect(cancelledCount).toBe(1);

    blocker.resolve();
    await activeTask.promise;
    await highTask.promise;

    try {
      await lowTask.promise;
      throw new Error("Expected low-priority thumbnail render to be cancelled");
    } catch (errorValue) {
      expect(isPdfThumbnailRenderCancelledError(errorValue)).toBe(true);
    }

    expect(started).toEqual(["active", "high"]);
    restoreConcurrency();
  });
});
