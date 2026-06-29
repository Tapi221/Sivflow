#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  AFFINE_ENV: process.env.AFFINE_ENV ?? 'dev',
  AFFINE_SERVER_EXTERNAL_URL:
    process.env.AFFINE_SERVER_EXTERNAL_URL ?? 'http://localhost:8080',
  DEBUG: process.env.DEBUG ?? 'affine:*',
  FORCE_COLOR: process.env.FORCE_COLOR ?? 'true',
  DEBUG_COLORS: process.env.DEBUG_COLORS ?? 'true',
};

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const workspaceDir = resolve(scriptDir, '..');
const rootDir = resolve(workspaceDir, '..', '..', '..');
const command =
  process.platform === 'win32'
    ? resolve(rootDir, 'node_modules', '.bin', 'tsx.cmd')
    : resolve(rootDir, 'node_modules', '.bin', 'tsx');
const child = spawn(command, ['watch', './src/index.ts'], {
  cwd: workspaceDir,
  env,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});

child.stdout?.on('data', chunk => {
  process.stdout.write(chunk);
});

child.stderr?.on('data', chunk => {
  process.stderr.write(chunk);
});

child.on('error', error => {
  console.error(`バックエンド開発サーバーの起動に失敗しました: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`バックエンド開発サーバーは ${signal} で終了しました。`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});
