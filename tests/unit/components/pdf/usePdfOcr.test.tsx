// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePdfOcr } from "@/components/pdf/hooks/usePdfOcr";
import type { PdfDocumentController } from "@/components/pdf/hooks/usePdfDocument";
import {
  getPdfOcrPageRecord,
  listPdfOcrPageRecords,
  putPdfOcrPageRecord,
} from "@/lib/pdf/pdfOcrStore";

vi.mock("tesseract.js", () => ({
  createWorker: vi.fn(async () => ({
    recognize: vi.fn(async () => ({ data: { text: "" } })),
    terminate: vi.fn(async () => undefined),
  })),
}));

vi.mock("@/lib/pdf/renderPdfPageForOcr", () => ({
  renderPdfPageForOcr: vi.fn(async () => ({
    canvas: document.createElement("canvas"),
  })),
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
          width: 1,
          height: 1,
        })),
      },
      release: vi.fn(),
    })),
    getPageTextContent: vi.fn(async () => ({
      items: nativeText.length > 0 ? [{ str: nativeText }] : [],
    })),
    prefetchPageResources: vi.fn(),
    getDocumentOutline: vi.fn(async () => []),
    getDocumentMarkdown: vi.fn(async () => ({
      content: "",
      sections: [],
    })),
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
      text: persistedText,
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

    const recordDuringUnresolvedPhase = await getPdfOcrPageRecord({
      docId,
      documentKey: resolvedDocumentKey,
      pageNumber: 1,
    });

    expect(recordDuringUnresolvedPhase?.text).toBe(persistedText);

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
      text: "oldest",
    });
    await putPdfOcrPageRecord({
      docId,
      documentKey: "fingerprint:older",
      pageNumber: 1,
      text: "older",
    });
    await putPdfOcrPageRecord({
      docId,
      documentKey: "fingerprint:recent",
      pageNumber: 1,
      text: "recent",
    });
    await putPdfOcrPageRecord({
      docId,
      documentKey: "fingerprint:active",
      pageNumber: 1,
      text: "active",
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

    const activeRecords = await listPdfOcrPageRecords({
      docId,
      documentKey: "fingerprint:active",
    });
    const olderRecords = await listPdfOcrPageRecords({
      docId,
      documentKey: "fingerprint:older",
    });
    const recentRecords = await listPdfOcrPageRecords({
      docId,
      documentKey: "fingerprint:recent",
    });

    expect(activeRecords).toHaveLength(1);
    expect(olderRecords).toHaveLength(1);
    expect(recentRecords).toHaveLength(1);
  });
});
