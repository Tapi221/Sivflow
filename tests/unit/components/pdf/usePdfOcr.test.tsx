// @vitest-environment jsdom
import "fake-indexeddb/auto";

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PdfDocumentController } from "@/components/pdf/hooks/usePdfDocument";
import { usePdfOcr } from "@/components/pdf/hooks/usePdfOcr";
import {
  getPdfOcrPageRecord,
  listPdfOcrPageRecords,
  putPdfOcrPageRecord,
} from "@/lib/pdf/pdfOcrStore";

const recognizeMock = vi.fn(async () => ({
  data: { text: "" },
}));
const createWorkerMock = vi.fn(async () => ({
  recognize: recognizeMock,
  terminate: vi.fn(async () => undefined),
}));
const renderPdfPageForOcrMock = vi.fn(async () => ({
  canvas: document.createElement("canvas"),
  scale: 2,
  profile: {
    mode: "none",
    targetPixels: 3_600_000,
    minScale: 1.6,
    maxScale: 2.6,
    trimWhitespace: false,
    contrastBoost: 1.04,
  },
}));

vi.mock("tesseract.js", () => ({
  createWorker: createWorkerMock,
}));

vi.mock("@/lib/pdf/renderPdfPageForOcr", () => ({
  renderPdfPageForOcr: renderPdfPageForOcrMock,
}));

const OCR_DB_NAME = "flashcard-master-pdf-ocr";

const createDocumentController = ({
  isResolved,
  nativeText = "",
}: {
  isResolved: boolean;
  nativeText?: string;
}): PdfDocumentController => {
  return {
    doc: isResolved
      ? ({
          numPages: 1,
          fingerprints: ["test-fingerprint"],
          getPage: vi.fn(),
        } as PdfDocumentController["doc"])
      : null,
    documentKey: isResolved ? "resolved" : "unloaded",
    numPages: 1,
    pageSizes: {},
    loading: false,
    error: null,
    setPageSize: vi.fn(),
    acquirePage: vi.fn(async () => ({
      page: {
        getViewport: vi.fn(() => ({
          width: 1000,
          height: 1400,
        })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      },
      release: vi.fn(),
    })),
    getPageTextContent: vi.fn(async () => ({
      items: nativeText.length > 0 ? [{ str: nativeText }] : [],
    })),
    getBestAvailablePageText: vi.fn(async () => nativeText),
    prefetchPageResources: vi.fn(),
    getDocumentOutline: vi.fn(async () => []),
    getDocumentMarkdown: vi.fn(async () => ({
      content: "",
      sections: [],
    })),
    invalidateDerivedTextCache: vi.fn(),
  };
};

const resetOcrDatabase = async () => {
  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(OCR_DB_NAME);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to delete OCR IndexedDB"));
    };

    request.onblocked = () => {
      reject(new Error("Failed to delete OCR IndexedDB because it is blocked"));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
};

describe("usePdfOcr", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    createWorkerMock.mockClear();
    recognizeMock.mockReset();
    recognizeMock.mockResolvedValue({ data: { text: "" } });
    renderPdfPageForOcrMock.mockClear();
    cleanup();
    await resetOcrDatabase();
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await resetOcrDatabase();
  });

  it("keeps persisted OCR records while the PDF identity is still unresolved", async () => {
    const docId = "doc-loading-regression";
    const resolvedDocumentKey = "fingerprint:resolved-loading-doc";
    const persistedText = "保存済み OCR テキスト";

    await putPdfOcrPageRecord({
      docId,
      documentKey: resolvedDocumentKey,
      pageNumber: 1,
      finalText: persistedText,
      nativeText: "",
      ocrText: persistedText,
    });

    const initialController = createDocumentController({
      isResolved: false,
    });

    const { result, rerender } = renderHook(
      ({
        currentDocumentKey,
        controller,
      }: {
        currentDocumentKey: string;
        controller: PdfDocumentController;
      }) =>
        usePdfOcr({
          docId,
          documentKey: currentDocumentKey,
          currentPage: 1,
          numPages: 1,
          documentController: controller,
        }),
      {
        initialProps: {
          currentDocumentKey: "unloaded",
          controller: initialController,
        },
      },
    );

    expect(result.current.hasAnyOcr).toBe(false);

    rerender({
      currentDocumentKey: resolvedDocumentKey,
      controller: createDocumentController({
        isResolved: true,
      }),
    });

    await waitFor(() => {
      expect(result.current.hasAnyOcr).toBe(true);
    });

    expect(result.current.ocrTextByPage[1]).toBe(persistedText);
    expect(result.current.ocrPageNumbers).toEqual([1]);
  });

  it("trims OCR retention by resolved document key without deleting the active cache", async () => {
    const nowSpy = vi.spyOn(Date, "now");
    let nextTimestamp = 1_000;

    nowSpy.mockImplementation(() => {
      const currentTimestamp = nextTimestamp;
      nextTimestamp += 1;
      return currentTimestamp;
    });

    const docId = "doc-retention-regression";

    await putPdfOcrPageRecord({
      docId,
      documentKey: "fingerprint:oldest",
      pageNumber: 1,
      finalText: "oldest",
      nativeText: "",
      ocrText: "oldest",
    });
    await putPdfOcrPageRecord({
      docId,
      documentKey: "fingerprint:older",
      pageNumber: 1,
      finalText: "older",
      nativeText: "",
      ocrText: "older",
    });
    await putPdfOcrPageRecord({
      docId,
      documentKey: "fingerprint:recent",
      pageNumber: 1,
      finalText: "recent",
      nativeText: "",
      ocrText: "recent",
    });
    await putPdfOcrPageRecord({
      docId,
      documentKey: "fingerprint:active",
      pageNumber: 1,
      finalText: "active",
      nativeText: "",
      ocrText: "active",
    });

    const { result } = renderHook(() =>
      usePdfOcr({
        docId,
        documentKey: "fingerprint:active",
        currentPage: 1,
        numPages: 1,
        documentController: createDocumentController({
          isResolved: true,
        }),
      }),
    );

    await waitFor(() => {
      expect(result.current.ocrTextByPage[1]).toBe("active");
    });

    await waitFor(async () => {
      const oldestRecords = await listPdfOcrPageRecords({
        docId,
        documentKey: "fingerprint:oldest",
      });
      expect(oldestRecords).toHaveLength(0);
    });
  });

  it("retries OCR with enhanced profiles for low quality native text and persists the best attempt", async () => {
    const docId = "doc-performance-retry";
    recognizeMock
      .mockResolvedValueOnce({ data: { text: "a b c d" } })
      .mockResolvedValueOnce({
        data: {
          text: "細胞分裂ではDNAが複製され、二つの娘細胞へ均等に分配される。",
        },
      });

    const { result } = renderHook(() =>
      usePdfOcr({
        docId,
        documentKey: "fingerprint:retry-target",
        currentPage: 1,
        numPages: 1,
        documentController: createDocumentController({
          isResolved: true,
          nativeText: "a\nb\nc\nd",
        }),
      }),
    );

    await waitFor(async () => {
      await result.current.runCurrentPageOcr();
      expect(result.current.ocrState.status).toBe("success");
    });

    const record = await getPdfOcrPageRecord({
      docId,
      documentKey: "fingerprint:retry-target",
      pageNumber: 1,
    });

    expect(record?.finalText).toContain("細胞分裂");
    expect(record?.attempts.length).toBeGreaterThanOrEqual(2);
    expect(createWorkerMock).toHaveBeenCalled();
    expect(renderPdfPageForOcrMock).toHaveBeenCalled();
  });
});
