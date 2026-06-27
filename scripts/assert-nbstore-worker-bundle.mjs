import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const webDistDir = path.resolve(repoRoot, "packages/frontend/apps/web/dist");
const sourceOnly = process.argv.includes("--source-only");

const sourceChecks = [
  {
    label: "Web nbstore worker entry",
    relativePath: "packages/frontend/apps/web/src/nbstore.worker.ts",
    required: [/import\s+["']@affine\/core\/bootstrap\/worker["'];?/],
    forbidden: [/@affine\/core\/bootstrap\/browser/],
  },
  {
    label: "Mobile nbstore worker entry",
    relativePath: "packages/frontend/apps/mobile/src/nbstore.worker.ts",
    required: [/import\s+["']@affine\/core\/bootstrap\/worker["'];?/],
    forbidden: [/@affine\/core\/bootstrap\/browser/],
  },
  {
    label: "Worker bootstrap",
    relativePath: "packages/frontend/core/src/bootstrap/worker.ts",
    required: [
      /import\s+["']\.\/env["'];?/,
      /import\s+["']\.\/public-path["'];?/,
      /import\s+["']\.\/polyfill\/worker["'];?/,
    ],
    forbidden: [/\.\/telemetry/, /\.\/polyfill\/browser/],
  },
  {
    label: "Worker polyfill",
    relativePath: "packages/frontend/core/src/bootstrap/polyfill/worker.ts",
    required: [
      /import\s+["']\.\/array["'];?/,
      /import\s+["']\.\/set["'];?/,
      /import\s+["']\.\/dispose["'];?/,
      /import\s+["']\.\/iterator-helpers["'];?/,
      /import\s+["']\.\/promise-with-resolvers["'];?/,
      /import\s+["']\.\/request-idle-callback["'];?/,
    ],
    forbidden: [/resize-observer/, /\.\/browser/, /\.\/html-element/],
  },
];

const bundleForbiddenSignatures = [
  /@sentry\/react/,
  /react-router-dom/,
  /reactRouterV6BrowserTracingIntegration/,
  /bootstrap\/browser/,
  /documentStub/,
  /createTreeWalker/,
];

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

const fail = message => {
  console.error(message);
  process.exitCode = 1;
};

for (const check of sourceChecks) {
  const absolutePath = path.resolve(repoRoot, check.relativePath);
  if (!existsSync(absolutePath)) {
    fail(`${check.label} が見つかりません: ${check.relativePath}`);
    continue;
  }

  const source = readFileSync(absolutePath, "utf8");

  for (const required of check.required) {
    if (!required.test(source)) {
      fail(
        `${check.label} に必須 import がありません: ${check.relativePath} (${required})`,
      );
    }
  }

  for (const forbidden of check.forbidden) {
    if (forbidden.test(source)) {
      fail(
        `${check.label} に Worker 禁止依存が残っています: ${check.relativePath} (${forbidden})`,
      );
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("nbstore worker のソース境界を確認しました。");

if (sourceOnly) {
  process.exit(0);
}

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

let hasLeak = false;

for (const workerFile of workerFiles) {
  const source = readFileSync(workerFile, "utf8");
  const leakedSignature = bundleForbiddenSignatures.find(signature =>
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
