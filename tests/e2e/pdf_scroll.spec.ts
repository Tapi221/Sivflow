import { expect, test } from "@playwright/test";

test.describe("PDF Scroll Container", () => {
  test("wheel scroll updates scrollTop", async ({ page }) => {
    test.setTimeout(120000);
    const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:5173";

    await page.goto(`${baseUrl}/pdf-scroll-test?test_bypass=true`, {
      waitUntil: "domcontentloaded",
    });

    const scrollContainer = page.getByTestId("pdf-scroll-container");
    await expect(scrollContainer).toBeVisible();

    const initialDiagnostics = await page.evaluate(() => {
      const debugWindow = window as Window & {
        __getPdfScrollDiagnostics?: () => {
          isScrollable: boolean;
          maxScrollTop: number;
        } | null;
      };
      return debugWindow.__getPdfScrollDiagnostics?.() ?? null;
    });
    expect(initialDiagnostics).not.toBeNull();

    await expect
      .poll(
        async () =>
          scrollContainer.evaluate((el) => el.scrollHeight - el.clientHeight),
        { timeout: 30000 },
      )
      .toBeGreaterThan(400);

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const debugWindow = window as Window & {
              __getPdfScrollDiagnostics?: () => {
                isScrollable: boolean;
                maxScrollTop: number;
              } | null;
            };
            return (
              debugWindow.__getPdfScrollDiagnostics?.()?.isScrollable ?? false
            );
          }),
        { timeout: 10000 },
      )
      .toBeTruthy();

    const startTop = await scrollContainer.evaluate((el) => el.scrollTop);

    await scrollContainer.hover();
    for (let i = 0; i < 4; i += 1) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(60);
    }

    await expect
      .poll(async () => scrollContainer.evaluate((el) => el.scrollTop), {
        timeout: 5000,
      })
      .toBeGreaterThan(startTop + 120);
  });
});
