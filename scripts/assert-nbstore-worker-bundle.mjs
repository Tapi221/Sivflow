import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const webDistDir = path.resolve(repoRoot, "packages/frontend/apps/web/dist");

const findFiles = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return findFiles(entryPath);
    }
    if (entry.isFile()) {
      return [entryPath];
    }
    return [];
  });

if (!existsSync(webDistDir) || !statSync(webDistDir).isDirectory()) {
  console.error(
    "Web build が見つかりません。先に `npm run build:web` を実行してください。",
  );
  process.exit(1);
}

const workerFiles = findFiles(webDistDir).filter(file =>
  /nbstore.*worker.*\.(?:js|mjs)$/.test(path.basename(file)),
);

if (workerFiles.length === 0) {
  console.error("nbstore worker bundle が見つかりません。");
  process.exit(1);
}

const forbiddenSignatures = [
  /@sentry\/react/,
  /react-router-dom/,
  /reactRouterV6BrowserTracingIntegration/,
  /bootstrap\/browser/,
];

let hasLeak = false;

for (const workerFile of workerFiles) {
  const source = readFileSync(workerFile, "utf8");
  const leakedSignature = forbiddenSignatures.find(signature =>
    signature.test(source),
  );

  if (leakedSignature) {
    console.error(
      `browser 専用依存が nbstore worker bundle に混入しています: ${path.relative(
        repoRoot,
        workerFile,
      )} (${leakedSignature})`,
    );
    hasLeak = true;
  }
}

if (hasLeak) {
  process.exit(1);
}

for (const workerFile of workerFiles) {
  console.log(
    `nbstore worker bundle を確認しました: ${path.relative(repoRoot, workerFile)}`,
  );
}
