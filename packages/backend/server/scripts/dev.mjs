#!/usr/bin/env node
import { spawn } from 'node:child_process';

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

const command = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
const child = spawn(command, ['watch', './src/index.ts'], {
  cwd: new URL('..', import.meta.url),
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
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
