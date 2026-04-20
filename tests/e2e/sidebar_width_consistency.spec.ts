import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:5173";

const disableAnimations = async (page: import("@playwright/test").Page) => {
  await page.addStyleTag({
    content: "* { animation: none !important; transition: none !important; }",
  });
};

const readSidebarWidth = async (page: import("@playwright/test").Page) => {
  return page.getByTestId("explorer-sidebar").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return Math.round(rect.width);
  });
};

const waitForSidebarWidth = async (
  page: import("@playwright/test").Page,
  expectedWidth: number,
) => {
  await expect
    .poll(async () => readSidebarWidth(page), {
      message: `sidebar width should settle around ${expectedWidth}px`,
    })
    .toBeGreaterThan(expectedWidth - 3);

  const actualWidth = await readSidebarWidth(page);
  expect(Math.abs(actualWidth - expectedWidth)).toBeLessThanOrEqual(2);

  return actualWidth;
};

test.describe("Sidebar width consistency", () => {
  test("desktop: switching explorer tabs should not change sidebar width", async ({
    page,
  }) => {
    const persistedSidebarWidth = 360;

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript((width) => {
      window.localStorage.setItem("ui.sidebarWidth", String(width));
      window.localStorage.setItem("ui.sidebarOpen", "true");
    }, persistedSidebarWidth);

    await page.goto(`${baseUrl}/folders?test_bypass=true`, {
      waitUntil: "networkidle",
    });

    await disableAnimations(page);

    const initialWidth = await waitForSidebarWidth(page, persistedSidebarWidth);

    await page.getByTestId("explorer-tab-recent").click();
    const recentWidth = await waitForSidebarWidth(page, persistedSidebarWidth);

    await page.getByTestId("explorer-tab-explorer").click();
    const explorerWidth = await waitForSidebarWidth(page, persistedSidebarWidth);

    expect(Math.abs(recentWidth - initialWidth)).toBeLessThanOrEqual(2);
    expect(Math.abs(explorerWidth - initialWidth)).toBeLessThanOrEqual(2);
  });
});
