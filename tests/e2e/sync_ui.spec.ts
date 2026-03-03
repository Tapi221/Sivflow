import { test, expect } from '@playwright/test';

/**
 * Sync UI Verification Script
 * 
 * Pre-requisites:
 * 1. App running on localhost:5173
 * 2. `forceSyncUI` hook present in SyncSettings.tsx
 */
test.describe('Sync UI Verification', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set a very long timeout for the test
    test.setTimeout(120000);
    
    // Navigate to the page with test bypass to skip login
    await page.goto('http://localhost:5173/sync-settings?test_bypass=true', { waitUntil: 'domcontentloaded' });
    
    // Debug: Wait for the main title to ensure we aren't stuck on a login page or loading spinner
    // If this fails, the app is likely stuck in `loading` state or redirected.
    await page.getByRole('heading', { name: '同期設定' }).waitFor({ state: 'visible', timeout: 60000 });
    
    // Explicitly wait for the React component to mount and render the tab
    const tabSelector = 'button[role="tab"]:has-text("同期診断")';
    await page.waitForSelector(tabSelector, { state: 'visible', timeout: 30000 });
    
    // Click the tab
    await page.click(tabSelector);
    
    // Reset debug state
    await page.evaluate(() => window.forceSyncUI(null, null));
  });

  test('Should verify Success State', async ({ page }) => {
    // Inject Success
    await page.evaluate(() => window.forceSyncUI('success', 0));
    
    // Check Header Status (Implicit via visual or text, let's check Tab content)
    await expect(page.locator('h2')).toContainText('同期完了');
    // Check Reassurance Message
    await expect(page.getByText('あなたのデータは安全にバックアップされています')).toBeVisible();
    
    // Check Icon Color (Green)
    // Note: checking classes/color in CSS is brittle, relying on Text presence for Reassurance logic
  });

  test('Should verify Error State', async ({ page }) => {
    // Inject Error
    await page.evaluate(() => window.forceSyncUI('error', 0));
    
    await expect(page.locator('h2')).toContainText('一時的なエラー');
    await expect(page.getByText('クラウドへの接続に失敗しました')).toBeVisible();
    await expect(page.getByText('データは端末内に安全に保存されています')).toBeVisible();
  });

  test('Should verify Conflict State (Priority)', async ({ page }) => {
    // Inject Success but with Conflict
    await page.evaluate(() => window.forceSyncUI('success', 3));
    
    // Should show Conflict, NOT Success
    await expect(page.locator('h2')).toContainText('データの競合があります');
    await expect(page.getByText('複数の端末で同時に編集されたデータがあります')).toBeVisible();
    
    // Check Menu Guidance (Manual step in automation usually involves opening menu)
    // await page.getByRole('button', { name: 'Menu' }).click(); // Selector depends on implementation
  });

  test('Should verify Collapsible Details', async ({ page }) => {
    // Initially Hidden (Stats not visible)
    await expect(page.getByText('成功率')).not.toBeVisible();
    
    // Toggle On
    await page.getByText('詳細・履歴を見る').click();
    await expect(page.getByText('成功率')).toBeVisible();
    
    // Toggle Off
    await page.getByText('詳細・履歴を見る').click();
    await expect(page.getByText('成功率')).not.toBeVisible();
  });
});

/**
 * TypeScript check fix for window object
 */
declare global {
    interface Window {
        forceSyncUI: (status: unknown, conflict: unknown) => void;
    }
}
