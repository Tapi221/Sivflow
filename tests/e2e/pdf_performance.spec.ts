import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type PdfPerformanceMetrics = {
  longTaskCount: number;
  loadedPageCount: number;
  markNames: string[];
  renderedCanvasCount: number;
  scrollTop: number;
};

declare global {
  interface Window {
    __sivflowPdfLongTaskDurations?: number[];
  }
}

const PDF_PERFORMANCE_LONG_TASK_LIMIT = 20;
const PDF_PERFORMANCE_SCROLL_STEPS = 18;
const PDF_PERFORMANCE_SCROLL_DELAY_MS = 120;
const PDF_PERFORMANCE_SCROLL_STEP_PX = 520;

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
      // long task 計測はスモークテスト用の補助情報なので、fixture 表示を止めない。
    }
  });
};

const readPdfPerformanceMetrics = async (page: Page): Promise<PdfPerformanceMetrics> => {
  return page.evaluate(() => {
    const markNames = performance.getEntriesByType("mark").map((entry) => entry.name).filter((name) => name.startsWith("sivflow.pdf."));
    const scrollContainer = document.querySelector<HTMLElement>("[data-testid='pdf-pane-scroll-container']");
    return {
      loadedPageCount: document.querySelectorAll(".pdfViewer .page[data-loaded='true']").length,
      longTaskCount: window.__sivflowPdfLongTaskDurations?.length ?? 0,
      markNames,
      renderedCanvasCount: document.querySelectorAll(".pdfViewer canvas").length,
      scrollTop: scrollContainer?.scrollTop ?? 0,
    };
  });
};

const collectPageFailures = (page: Page): string[] => {
  const failures: string[] = [];

  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) failures.push(`http ${response.status()}: ${response.url()}`);
  });

  return failures;
};

test.describe("PDF性能スモーク", () => {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:5173";

  test("生成したPDFを連続スクロールしても過剰なlong taskを発生させずperformance markを記録する", async ({ page }) => {
    test.setTimeout(120000);
    const pageFailures = collectPageFailures(page);
    await installPdfPerformanceObservers(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${baseUrl}/pdf-performance-test?test_bypass=true`, { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("pdf-performance-source-type")).toHaveText("url", { timeout: 30000 });
    await expect(page.locator(".pdfViewer .page").first()).toBeVisible({ timeout: 30000 });

    const scrollContainer = page.getByTestId("pdf-pane-scroll-container");
    for (let index = 0; index < PDF_PERFORMANCE_SCROLL_STEPS; index += 1) {
      await scrollContainer.evaluate(
        (element, { step, stepPx }) => {
          element.scrollTo({ top: step * stepPx, behavior: "instant" });
        },
        { step: index + 1, stepPx: PDF_PERFORMANCE_SCROLL_STEP_PX },
      );
      await page.waitForTimeout(PDF_PERFORMANCE_SCROLL_DELAY_MS);
    }
    await page.waitForTimeout(300);

    const metrics = await readPdfPerformanceMetrics(page);
    expect(pageFailures).toEqual([]);
    expect(metrics.markNames).toContainEqual(expect.stringMatching(/^sivflow\.pdf\.viewer\.load\.\d+\.pagesinit$/));
    expect(metrics.markNames).toContainEqual(expect.stringMatching(/^sivflow\.pdf\.viewer\.load\.\d+\.pagechanging$/));
    expect(metrics.markNames).toContainEqual(expect.stringMatching(/^sivflow\.pdf\.viewer\.load\.\d+\.scrollActive$/));
    expect(metrics.loadedPageCount).toBeGreaterThan(0);
    expect(metrics.renderedCanvasCount).toBeGreaterThan(0);
    expect(metrics.scrollTop).toBeGreaterThan(0);
    expect(metrics.longTaskCount).toBeLessThanOrEqual(PDF_PERFORMANCE_LONG_TASK_LIMIT);
  });

  test("PDFを開閉してもソース解放後にfixtureが壊れず再表示できる", async ({ page }) => {
    test.setTimeout(120000);
    const pageFailures = collectPageFailures(page);
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
    expect(pageFailures).toEqual([]);
    expect(metrics.markNames).toContainEqual(expect.stringMatching(/^sivflow\.pdf\.viewer\.load\.\d+\.cleanup$/));
    expect(metrics.markNames).toContainEqual(expect.stringMatching(/^sivflow\.pdf\.viewer\.load\.\d+\.pagesinit$/));
    expect(metrics.loadedPageCount).toBeGreaterThan(0);
    expect(metrics.renderedCanvasCount).toBeGreaterThan(0);
  });
});
