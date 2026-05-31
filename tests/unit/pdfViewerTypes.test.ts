import { describe, expect, it, vi } from "vitest";
import { disposePdfDocumentResource, getPdfErrorDetails, isPdfAbortError } from "@/components/pdf/pdfViewerTypes";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("pdfViewerTypes", () => {
  describe("isPdfAbortError", () => {
    it("PDF.js のキャンセルエラーを検出する", () => {
      expect(
        isPdfAbortError({
          name: "RenderingCancelledException",
          message: "Rendering cancelled, page was discarded",
        }),
      ).toBe(true);

      expect(
        isPdfAbortError({
          message: "The operation was aborted by the user",
        }),
      ).toBe(true);

      expect(isPdfAbortError(new Error("network failed"))).toBe(false);
    });
  });

  describe("getPdfErrorDetails", () => {
    it("シリアライズ可能なエラー詳細を抽出する", () => {
      const details = getPdfErrorDetails({
        name: "CustomError",
        message: "broken",
        code: "E_CUSTOM",
        stack: "stack trace",
      });

      expect(details).toEqual({
        name: "CustomError",
        message: "broken",
        code: "E_CUSTOM",
        stack: "stack trace",
      });
    });
  });

  describe("disposePdfDocumentResource", () => {
    it("destroy の前に cleanup を実行する", async () => {
      const events: string[] = [];
      const cleanup = vi.fn(async () => {
        events.push("cleanup");
      });
      const destroy = vi.fn(async () => {
        events.push("destroy");
      });

      disposePdfDocumentResource({
        cleanup,
        destroy,
      });

      await flushMicrotasks();

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(events).toEqual(["cleanup", "destroy"]);
    });
  });
});
