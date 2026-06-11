import { describe, expect, it, vi } from "vitest";

import { PDF_LOAD_TIMEOUT_ERROR_MESSAGE, waitForPdfLoadingTask } from "@/features/pdf/pdfLoadingTaskTimeout";

describe("waitForPdfLoadingTask", () => {
  it("ロードが完了すれば結果を返す", async () => {
    await expect(
      waitForPdfLoadingTask({ promise: Promise.resolve("loaded") }, 100),
    ).resolves.toBe("loaded");
  });

  it("ロードが完了しなければタスクを破棄してタイムアウトする", async () => {
    vi.useFakeTimers();
    try {
      const destroy = vi.fn();
      const pending = new Promise<string>(() => undefined);
      const result = waitForPdfLoadingTask({ promise: pending, destroy }, 50);
      const expectation = expect(result).rejects.toThrow(PDF_LOAD_TIMEOUT_ERROR_MESSAGE);

      await vi.advanceTimersByTimeAsync(50);

      await expectation;
      expect(destroy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
