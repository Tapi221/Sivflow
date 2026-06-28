#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const electronDir = resolve(rootDir, 'packages/frontend/apps/electron');
const electronPackageJsonPath = resolve(electronDir, 'package.json');
const tsxBin = resolve(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
);

const nodeVersion = process.versions.node;
const [nodeMajor = 0, nodeMinor = 0] = nodeVersion
  .split('.')
  .map(part => Number(part));
const isSupportedNode =
  (nodeMajor === 20 && nodeMinor >= 19) || nodeMajor === 21 || nodeMajor === 22;

function fail(message) {
  console.error(message.trim());
  process.exit(1);
}

if (!isSupportedNode) {
  fail(`
Node.js v${nodeVersion} は Sivflow の対応範囲外です。
対応範囲: >=20.19.0 <23.0.0

PowerShell では次を実行してください:
  nvm use 22.20.0
  node -v
  npm run dev:electron
`);
}

if (!existsSync(electronPackageJsonPath)) {
  fail(`
Electron ワークスペースが見つかりません。
確認した場所: ${electronPackageJsonPath}

C:\\Sivflow 直下で実行しているか確認してください。
`);
}

if (!existsSync(tsxBin)) {
  fail(`
tsx が見つかりません。
確認した場所: ${tsxBin}

依存関係が壊れている可能性があります。PowerShell で次を実行してください:
  npm install
  npm run dev:electron
`);
}

const electronPackageJson = JSON.parse(
  readFileSync(electronPackageJsonPath, 'utf-8')
);

if (!electronPackageJson.scripts?.dev) {
  fail(`
@affine/electron の dev スクリプトが見つかりません。
確認したファイル: ${electronPackageJsonPath}
`);
}

const env = {
  ...process.env,
  DEV_SERVER_URL: process.env.DEV_SERVER_URL ?? 'http://127.0.0.1:8080',
};

console.log(`Electron 開発起動を開始します: ${env.DEV_SERVER_URL}`);

const startedAt = Date.now();
const child = spawn(tsxBin, ['./scripts/dev.ts'], {
  cwd: electronDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('error', error => {
  fail(`
Electron 開発起動に失敗しました。
${error instanceof Error ? error.message : String(error)}
`);
});

child.on('exit', (code, signal) => {
  const elapsedMs = Date.now() - startedAt;

  if (signal) {
    console.error(`Electron 開発プロセスは ${signal} で終了しました。`);
    process.exit(1);
  }

  if ((code ?? 0) === 0 && elapsedMs < 3000) {
    fail(`
Electron 開発プロセスがすぐに終了しました。
通常は「Electron を起動しています...」が表示され、監視状態のまま止まります。

PowerShell で次を確認してください:
  node -v
  npm --workspace @affine/electron run dev
`);
  }

  process.exit(code ?? 0);
});
