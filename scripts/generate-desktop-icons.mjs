import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repositoryRoot = resolve(__dirname, "..");
const sourceIconPath = resolve(repositoryRoot, "shared/assets/icons/app-icon.svg");
const outputIconPath = resolve(repositoryRoot, "apps/desktop/src-tauri/icons");

if (!existsSync(sourceIconPath)) {
  throw new Error(`元アイコンが見つかりません: ${sourceIconPath}`);
}

const result = spawnSync("npm", ["exec", "tauri", "--", "icon", sourceIconPath, "--output", outputIconPath], {
  cwd: repositoryRoot,
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(`デスクトップアイコンの生成に失敗しました。終了コード: ${result.status ?? "unknown"}`);
}
