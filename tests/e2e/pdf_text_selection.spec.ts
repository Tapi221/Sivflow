import { expect, test } from "@playwright/test";

test.describe("PDF テキスト選択", () => {
  test("テキストレイヤーで空ではない選択範囲を取得できる", async ({ page }) => {
    test.setTimeout(120000);
    const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:5173";

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${baseUrl}/pdf-scroll-test?test_bypass=true`, {
      waitUntil: "domcontentloaded",
    });

    const textLayer = page.locator(".pdf-text-layer").first();
    await expect(textLayer).toHaveAttribute(
      "data-text-layer-expected-text",
      "true",
    );
    await expect(textLayer).toHaveAttribute("data-text-layer-ready", "true");

    const textSpan = page
      .locator(".pdf-text-layer span")
      .filter({ hasText: "PDF E2E Scroll Page 1" })
      .first();

    await expect(textSpan).toBeVisible();

    const box = await textSpan.boundingBox();
    expect(box).not.toBeNull();

    if (!box) {
      throw new Error("PDF テキスト span の bounding box を取得できません");
    }

    await page.mouse.move(box.x + 4, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + Math.max(24, box.width - 4),
      box.y + box.height / 2,
      {
        steps: 12,
      },
    );
    await page.mouse.up();

    const selectedText = await page.evaluate(() => {
      return window.getSelection()?.toString().trim() ?? "";
    });

    expect(selectedText.length).toBeGreaterThan(0);
    expect(selectedText).toContain("PDF E2E Scroll Page 1");
  });
});
