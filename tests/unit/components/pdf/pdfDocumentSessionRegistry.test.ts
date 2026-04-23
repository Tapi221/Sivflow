import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PdfJsDocument,
  PdfJsGetDocumentParams,
  PdfJsLoadingTask,
} from "@/components/pdf/pdfViewerTypes";
import { clearPdfPageBitmapCacheForDocument } from "@/components/pdf/pdfPageBitmapCache";
import {
  PDF_DOCUMENT_SESSION_RELEASE_GRACE_MS,
  acquirePdfDocumentSession,
  resetPdfDocumentSessionRegistryForTests,
} from "@/components/pdf/pdfDocumentSessionRegistry";
import {
  destroyPdfResource,
  disposePdfDocumentResource,
  getPdfDocument,
} from "@/components/pdf/pdfViewerTypes";

vi.mock("@/components/pdf/pdfPageBitmapCache", () => ({
  clearPdfPageBitmapCacheForDocument: vi.fn(),
}));

vi.mock("@/components/pdf/pdfViewerTypes", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/pdf/pdfViewerTypes")>();

  return {
    ...actual,
    getPdfDocument: vi.fn(),
    destroyPdfResource: vi.fn(),
    disposePdfDocumentResource: vi.fn(),
  };
});

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const createMockPdfDocument = (fingerprint: string): PdfJsDocument => ({
  numPages: 1,
  fingerprints: [fingerprint],
  getPage: vi.fn(),
});

const createLoadingTask = (
  documentPromise: Promise<PdfJsDocument>,
): PdfJsLoadingTask => ({
  promise: documentPromise,
  destroy: vi.fn(),
});

const createRemoteSessionOptions = (
  url: string,
  params?: Partial<PdfJsGetDocumentParams>,
) => ({
  source: {
    url,
    data: null,
  },
  sourceMeta: {
    remoteUrl: url,
    url,
    localFileId: null,
    blobUrl: null,
  },
  getDocumentParams: {
    url,
    ...params,
  } satisfies PdfJsGetDocumentParams,
});

describe("pdfDocumentSessionRegistry", () => {
  const getPdfDocumentMock = vi.mocked(getPdfDocument);
  const destroyPdfResourceMock = vi.mocked(destroyPdfResource);
  const disposePdfDocumentResourceMock = vi.mocked(disposePdfDocumentResource);
  const clearPdfPageBitmapCacheMock = vi.mocked(
    clearPdfPageBitmapCacheForDocument,
  );

  beforeEach(() => {
    vi.useFakeTimers();
    resetPdfDocumentSessionRegistryForTests();

    getPdfDocumentMock.mockReset();
    destroyPdfResourceMock.mockReset();
    disposePdfDocumentResourceMock.mockReset();
    clearPdfPageBitmapCacheMock.mockReset();
  });

  afterEach(() => {
    resetPdfDocumentSessionRegistryForTests();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("reuses the same loading task across transient release and reacquire", async () => {
    const deferred = createDeferred<PdfJsDocument>();
    const loadingTask = createLoadingTask(deferred.promise);

    getPdfDocumentMock.mockReturnValue(loadingTask);

    const options = createRemoteSessionOptions("https://example.com/a.pdf");
    const firstLease = acquirePdfDocumentSession(options);

    firstLease.release();

    vi.advanceTimersByTime(PDF_DOCUMENT_SESSION_RELEASE_GRACE_MS - 1);
    expect(destroyPdfResourceMock).not.toHaveBeenCalled();

    const secondLease = acquirePdfDocumentSession(options);
    expect(getPdfDocumentMock).toHaveBeenCalledTimes(1);

    const pdf = createMockPdfDocument("shared-fingerprint");
    deferred.resolve(pdf);

    await expect(secondLease.documentPromise).resolves.toEqual({
      pdf,
      documentKey: "fingerprint:shared-fingerprint",
    });

    secondLease.release();

    vi.advanceTimersByTime(PDF_DOCUMENT_SESSION_RELEASE_GRACE_MS);

    expect(destroyPdfResourceMock).toHaveBeenCalledTimes(1);
    expect(disposePdfDocumentResourceMock).toHaveBeenCalledWith(pdf);
    expect(clearPdfPageBitmapCacheMock).toHaveBeenCalledWith(
      "fingerprint:shared-fingerprint",
    );
  });

  it("removes rejected sessions from the registry and recreates them on retry", async () => {
    const firstDeferred = createDeferred<PdfJsDocument>();
    const secondDeferred = createDeferred<PdfJsDocument>();

    getPdfDocumentMock
      .mockReturnValueOnce(createLoadingTask(firstDeferred.promise))
      .mockReturnValueOnce(createLoadingTask(secondDeferred.promise));

    const options = createRemoteSessionOptions("https://example.com/retry.pdf");
    const firstLease = acquirePdfDocumentSession(options);

    firstDeferred.reject(new Error("initial load failed"));

    await expect(firstLease.documentPromise).rejects.toThrow(
      "initial load failed",
    );

    firstLease.release();

    const secondLease = acquirePdfDocumentSession(options);
    const retryPdf = createMockPdfDocument("retry-fingerprint");

    secondDeferred.resolve(retryPdf);

    await expect(secondLease.documentPromise).resolves.toEqual({
      pdf: retryPdf,
      documentKey: "fingerprint:retry-fingerprint",
    });

    expect(getPdfDocumentMock).toHaveBeenCalledTimes(2);

    secondLease.release();
    vi.advanceTimersByTime(PDF_DOCUMENT_SESSION_RELEASE_GRACE_MS);

    expect(destroyPdfResourceMock).toHaveBeenCalledTimes(2);
  });

  it("disposes documents that resolve after the session was already released", async () => {
    const deferred = createDeferred<PdfJsDocument>();
    getPdfDocumentMock.mockReturnValue(createLoadingTask(deferred.promise));

    const options = createRemoteSessionOptions("https://example.com/late.pdf");
    const lease = acquirePdfDocumentSession(options);

    lease.release();
    vi.advanceTimersByTime(PDF_DOCUMENT_SESSION_RELEASE_GRACE_MS);

    expect(destroyPdfResourceMock).toHaveBeenCalledTimes(1);

    const latePdf = createMockPdfDocument("late-fingerprint");
    deferred.resolve(latePdf);

    await flushMicrotasks();

    await expect(lease.documentPromise).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(disposePdfDocumentResourceMock).toHaveBeenCalledWith(latePdf);
    expect(clearPdfPageBitmapCacheMock).toHaveBeenCalledWith(
      "fingerprint:late-fingerprint",
    );
  });
});
