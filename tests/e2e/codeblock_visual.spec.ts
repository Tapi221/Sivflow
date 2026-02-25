import { expect, test } from '@playwright/test';

test.describe('CodeBlock visual regression', () => {
  test('viewer/editor frame should remain visually stable', async ({ page }) => {
    test.setTimeout(120000);
    const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${baseUrl}/codeblock-visual-test?test_bypass=true`, {
      waitUntil: 'domcontentloaded',
    });

    const viewer = page.getByTestId('codeblock-viewer-shot');
    const editor = page.getByTestId('codeblock-editor-shot');

    await expect(viewer).toBeVisible();
    await expect(editor).toBeVisible();

    await expect(viewer).toHaveScreenshot('codeblock-viewer.png');
    await expect(editor).toHaveScreenshot('codeblock-editor.png');
  });
});

