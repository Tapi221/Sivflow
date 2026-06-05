import { expect, test } from "@playwright/test";

/**
 * 同期 UI 検証スクリプト
 *
 * 前提条件:
 * 1. アプリが localhost:5173 で起動していること
 * 2. SyncSettings.tsx に `forceSyncUI` フックが存在すること
 */
test.describe("同期 UI 検証", () => {
  test.beforeEach(async ({ page }) => {
    // テスト用に十分長いタイムアウトを設定する
    test.setTimeout(120000);

    // ログインをスキップするため、テスト用バイパス付きでページへ移動する
    await page.goto("http://localhost:5173/sync-settings?test_bypass=true", {
      waitUntil: "domcontentloaded",
    });

    // ログイン画面やローディングスピナーで止まっていないことを確認するため、メインタイトルを待つ
    // ここで失敗する場合、アプリが `loading` 状態で止まっているかリダイレクトされている可能性が高い。
    await page
      .getByRole("heading", { name: "同期設定" })
      .waitFor({ state: "visible", timeout: 60000 });

    // React component がマウントされ、タブが描画されるまで明示的に待つ
    const tabSelector = "button[role=\"tab\"]:has-text(\"同期診断\")";
    await page.waitForSelector(tabSelector, {
      state: "visible",
      timeout: 30000,
    });

    // タブをクリックする
    await page.click(tabSelector);

    // デバッグ状態をリセットする
    await page.evaluate(() => window.forceSyncUI(null, null));
  });

  test("成功状態を検証する", async ({ page }) => {
    // 成功状態を注入する
    await page.evaluate(() => window.forceSyncUI("success", 0));

    // ヘッダー状態を確認する
    await expect(page.locator("h2")).toContainText("同期完了");
    // 安心表示のメッセージを確認する
    await expect(
      page.getByText("あなたのデータは安全にバックアップされています"),
    ).toBeVisible();

    // アイコン色（緑）を確認する
    // 注記: CSS の class / color 確認は壊れやすいため、安心表示ロジックはテキストの存在に依存する
  });

  test("エラー状態を検証する", async ({ page }) => {
    // エラー状態を注入する
    await page.evaluate(() => window.forceSyncUI("error", 0));

    await expect(page.locator("h2")).toContainText("一時的なエラー");
    await expect(
      page.getByText("クラウドへの接続に失敗しました"),
    ).toBeVisible();
    await expect(
      page.getByText("データは端末内に安全に保存されています"),
    ).toBeVisible();
  });

  test("競合状態が優先されることを検証する", async ({ page }) => {
    // 成功状態に競合を重ねて注入する
    await page.evaluate(() => window.forceSyncUI("success", 3));

    // 成功状態ではなく競合状態が表示されることを確認する
    await expect(page.locator("h2")).toContainText("データの競合があります");
    await expect(
      page.getByText("複数の端末で同時に編集されたデータがあります"),
    ).toBeVisible();

    // メニュー案内を確認する（自動化で手動手順を扱う場合は通常メニューを開く）
    // await page.getByRole('button', { name: 'Menu' }).click(); // セレクタは実装に依存する
  });

  test("折りたたみ詳細を検証する", async ({ page }) => {
    // 初期状態では非表示（統計情報は表示されない）
    await expect(page.getByText("成功率")).not.toBeVisible();

    // 開く
    await page.getByText("詳細・履歴を見る").click();
    await expect(page.getByText("成功率")).toBeVisible();

    // 閉じる
    await page.getByText("詳細・履歴を見る").click();
    await expect(page.getByText("成功率")).not.toBeVisible();
  });
});

/**
 * window object の TypeScript チェック修正
 */
declare global {
  interface Window {
    forceSyncUI: (status: unknown, conflict: unknown) => void;
  }
}
