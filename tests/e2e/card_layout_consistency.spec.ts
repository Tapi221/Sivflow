import { expect, test } from '@playwright/test';

type Rect = { width: number; height: number };

const readCardRect = async (selector: string, page: import('@playwright/test').Page): Promise<Rect> => {
  const root = page.getByTestId(selector);
  await expect(root).toBeVisible();

  return root.locator('.card-shell--paper').first().evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  });
};

test.describe('Card layout consistency', () => {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
  const preparePage = async (page: import('@playwright/test').Page) => {
    await page.addStyleTag({
      content: '* { animation: none !important; transition: none !important; }',
    });
  };

  test('desktop: view/edit shell dimensions should match', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await preparePage(page);
    await page.goto(`${baseUrl}/card-layout-test?test_bypass=true`, {
      waitUntil: 'networkidle',
    });

    const viewRect = await readCardRect('card-layout-view-shot', page);
    const editRect = await readCardRect('card-layout-edit-shot', page);

    expect(Math.abs(viewRect.width - editRect.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(viewRect.height - editRect.height)).toBeLessThanOrEqual(2);
  });

  test('mobile: view/edit shell dimensions should match', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await preparePage(page);
    await page.goto(`${baseUrl}/card-layout-test?test_bypass=true`, {
      waitUntil: 'networkidle',
    });

    const viewRect = await readCardRect('card-layout-view-shot', page);
    const editRect = await readCardRect('card-layout-edit-shot', page);

    expect(Math.abs(viewRect.width - editRect.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(viewRect.height - editRect.height)).toBeLessThanOrEqual(2);
  });
});
