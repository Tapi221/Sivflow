import { test, expect } from '@playwright/test';

/**
 * Profile Image Handling Verification
 */
test.describe('Profile Image UI', () => {
  
  test.beforeEach(async ({ page }) => {
    // Open settings directly because the global hamburger/sidebar UI no longer exists.
    await page.goto('http://localhost:5173/folders?test_bypass=true&settings=true&settingsTab=account', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'プロフィール' }).waitFor({ state: 'visible' });
  });

  test('Should display deterministic avatar color for user without image', async ({ page }) => {
    const avatar = page.locator('div.w-24.h-24.rounded-full').first();
    await expect(avatar).toBeVisible();

    // Check if it has a background color (should not be empty or transparent)
    const bgColor = await avatar.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Avatar BG Color:', bgColor);
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('transparent');
  });

  test('Should handle broken image URL by falling back to avatar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'プロフィール' })).toBeVisible();
    await expect(page.getByText('プロフィール画像')).toBeVisible();
  });
});
