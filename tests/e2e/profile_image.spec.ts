import { test, expect } from "@playwright/test";

/**
 * Settings Footer Profile Verification
 */
test.describe("Settings footer profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "http://localhost:5173/folders?test_bypass=true&settings=true&settingsTab=study",
      { waitUntil: "domcontentloaded" },
    );
    await page.getByRole("dialog").waitFor({ state: "visible" });
  });

  test("Should display footer avatar and email area", async ({ page }) => {
    const footer = page.locator("text=ログアウト").locator("..");
    const avatar = footer.locator("img, div.rounded-full").first();
    await expect(avatar).toBeVisible();

    await expect(footer).toContainText("ログアウト");
  });

  test("Should keep email visible in footer", async ({ page }) => {
    const footer = page.locator("text=ログアウト").locator("..");
    await expect(footer.locator("text=@")).toBeVisible();
  });
});
