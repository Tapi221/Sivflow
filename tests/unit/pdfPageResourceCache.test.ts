import { describe, expect, it, vi } from "vitest";
import { createPdfPageResourceCache } from "@/components/pdf/pdfPageResourceCache";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("pdfPageResourceCache", () => {
  it("does not evict retained pages", async () => {
    const cleanupPage = vi.fn();
    const loadPage = vi.fn(async (pageNumber: number) => ({ pageNumber }));

    const cache = createPdfPageResourceCache({
      loadPage,
      cleanupPage,
      maxEntries: 1,
    });

    const retainedPageLease = await cache.acquirePage(1);
    cache.prefetchPage(2);

    await flushMicrotasks();

    expect(cleanupPage).toHaveBeenCalledTimes(1);
    expect(cleanupPage).toHaveBeenCalledWith({ pageNumber: 2 });

    retainedPageLease.release();
  });

  it("evicts the least recently used released page", async () => {
    const cleanupPage = vi.fn();
    const loadPage = vi.fn(async (pageNumber: number) => ({ pageNumber }));

    const cache = createPdfPageResourceCache({
      loadPage,
      cleanupPage,
      maxEntries: 1,
    });

    const firstPageLease = await cache.acquirePage(1);
    firstPageLease.release();

    cache.prefetchPage(2);

    await flushMicrotasks();

    expect(cleanupPage).toHaveBeenCalledTimes(1);
    expect(cleanupPage).toHaveBeenCalledWith({ pageNumber: 1 });
    expect(cache.getSize()).toBe(1);
  });

  it("keeps release idempotent", async () => {
    const cleanupPage = vi.fn();
    const loadPage = vi.fn(async (pageNumber: number) => ({ pageNumber }));

    const cache = createPdfPageResourceCache({
      loadPage,
      cleanupPage,
      maxEntries: 1,
    });

    const firstPageLease = await cache.acquirePage(1);
    firstPageLease.release();
    firstPageLease.release();

    cache.prefetchPage(2);

    await flushMicrotasks();

    expect(cleanupPage).toHaveBeenCalledTimes(1);
    expect(cleanupPage).toHaveBeenCalledWith({ pageNumber: 1 });
  });
});
