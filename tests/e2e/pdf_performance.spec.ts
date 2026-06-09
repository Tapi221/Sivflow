import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type PdfPerformanceMetrics = {
  longTaskCount: number;
  markNames: string[];
};

declare global {
  interface Window {
    __sivflowPdfLongTaskDurations?: number[];
  }
}

const PDF_PERFORMANCE_LONG_TASK_LIMIT = 20;
const PDF_PERFORMANCE_SCROLL_STEPS = 18;
const PDF_PERFORMANCE_SCROLL_DELAY_MS = 120;

const installPdfPerformanceObservers = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.__sivflowPdfLongTaskDurations = [];
    window.localStorage.setItem("sivflow.pdf.debugPerformance", "1");

    if (typeof PerformanceObserver === "undefined") return;

    try {
      const observer = new PerformanceObserver((list) => {
        window.__sivflowPdfLongTaskDurations?.push(...list.getEntries().map((entry) => entry.duration));
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      // Long task observation is a smoke-test signal and must not block the fixture route.
    }
  });
};

const readPdfPerformanceMetrics = async (page: Page): Promise<PdfPerformanceMetrics> => {
  return page.evaluate(() => {
    const markNames = performance.getEntriesByType("mark").map((entry) => entry.name).filter((name) => name.startsWith("sivflow.pdf."));
    return {
      longTaskCount: window.__sivflowPdfLongTaskDurations?.length ?? 0,
      markNames,
    };
  });
};

test.describe("PDF performance smoke", () => {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:5173";

  test("scrolling a generated PDF emits performance marks without excessive long tasks", async ({ page }) => {
    test.setTimeout(120000);
    await installPdfPerformanceObservers(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${baseUrl}/pdf-performance-test?test_bypass=true`, { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("pdf-performance-source-type")).toHaveText("url", { timeout: 30000 });
    await expect(page.locator(".pdfViewer .page").first()).toBeVisible({ timeout: 30000 });

    const scrollContainer = page.locator(".overflow-auto").first();
    for (let index = 0; index < PDF_PERFORMANCE_SCROLL_STEPS; index += 1) {
      await scrollContainer.evaluate((element, step) => {
        element.scrollTo({ top: step * 520, behavior: "instant" });
      }, index + 1);
      await page.waitForTimeout(PDF_PERFORMANCE_SCROLL_DELAY_MS);
    }

    const metrics = await readPdfPerformanceMetrics(page);
    expect(metrics.markNames).toContainEqual(expect.stringMatching(/^sivflow\.pdf\.viewer\.load\.\d+\.pagesinit$/));
    expect(metrics.markNames).toContainEqual(expect.stringMatching(/^sivflow\.pdf\.viewer\.load\.\d+\.pagechanging$/));
    expect(metrics.longTaskCount).toBeLessThanOrEqual(PDF_PERFORMANCE_LONG_TASK_LIMIT);
  });

  test("open and close releases the PDF source path without leaving the fixture broken", async ({ page }) => {
    test.setTimeout(120000);
    await installPdfPerformanceObservers(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${baseUrl}/pdf-performance-test?test_bypass=true`, { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("pdf-performance-source-type")).toHaveText("url", { timeout: 30000 });
    await expect(page.locator(".pdfViewer .page").first()).toBeVisible({ timeout: 30000 });

    await page.getByTestId("pdf-performance-toggle").click();
    await expect(page.getByTestId("pdf-performance-source-type")).toHaveText("none", { timeout: 30000 });
    await expect(page.locator(".pdfViewer .page")).toHaveCount(0);

    await page.getByTestId("pdf-performance-toggle").click();
    await expect(page.getByTestId("pdf-performance-source-type")).toHaveText("url", { timeout: 30000 });
    await expect(page.locator(".pdfViewer .page").first()).toBeVisible({ timeout: 30000 });

    const metrics = await readPdfPerformanceMetrics(page);
    expect(metrics.markNames).toContainEqual(expect.stringMatching(/^sivflow\.pdf\.viewer\.load\.\d+\.cleanup$/));
    expect(metrics.markNames).toContainEqual(expect.stringMatching(/^sivflow\.pdf\.viewer\.load\.\d+\.pagesinit$/));
  });
});
