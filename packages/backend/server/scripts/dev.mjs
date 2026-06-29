#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const workspaceDir = resolve(scriptDir, '..');
const rootDir = resolve(workspaceDir, '..', '..', '..');
const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  AFFINE_ENV: process.env.AFFINE_ENV ?? 'dev',
  AFFINE_SERVER_EXTERNAL_URL:
    process.env.AFFINE_SERVER_EXTERNAL_URL ?? 'http://localhost:8080',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://sivflow:sivflow@localhost:5432/sivflow?schema=public',
  POSTGRES_HOST: process.env.POSTGRES_HOST ?? 'localhost',
  POSTGRES_PORT: process.env.POSTGRES_PORT ?? '5432',
  REDIS_SERVER_HOST: process.env.REDIS_SERVER_HOST ?? 'localhost',
  REDIS_SERVER_PORT: process.env.REDIS_SERVER_PORT ?? '6379',
  SIVFLOW_STARTUP_TRACE: process.env.SIVFLOW_STARTUP_TRACE ?? 'true',
  SIVFLOW_STARTUP_TRACE_FILE:
    process.env.SIVFLOW_STARTUP_TRACE_FILE ??
    resolve(rootDir, '.backend-startup-trace.log'),
  DEBUG: process.env.DEBUG ?? 'affine:*',
  FORCE_COLOR: process.env.FORCE_COLOR ?? 'true',
  DEBUG_COLORS: process.env.DEBUG_COLORS ?? 'true',
};

const backendBootstrapScriptPath = resolve(
  rootDir,
  'scripts',
  'ensure-local-backend-prereqs.mjs'
);
const command =
  process.platform === 'win32'
    ? resolve(rootDir, 'node_modules', '.bin', 'tsx.cmd')
    : resolve(rootDir, 'node_modules', '.bin', 'tsx');

const bootstrap = spawnSync(process.execPath, [backendBootstrapScriptPath], {
  cwd: rootDir,
  env,
  stdio: 'inherit',
  shell: false,
});

if (bootstrap.status !== 0) {
  process.exit(bootstrap.status ?? 1);
}

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
