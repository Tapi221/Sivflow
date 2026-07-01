/**
 * dev-web-backend.mjs
 *
 * `npm run dev:web` から呼ばれる統合起動スクリプト。
 * 以下を順番に実行する:
 *   1. Docker Desktop が起動していなければ自動で起動して待機
 *   2. docker compose up -d で PostgreSQL・Redis を起動
 *   3. PostgreSQL の準備完了を待機
 *   4. DB マイグレーションを適用
 *   5. バックエンド (NestJS) と フロントエンド (Vite) を並列起動
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const REQUIRED_NODE_RANGE = '>=20.19.0 <23.0.0';
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const defaultBackendHost = '127.0.0.1';
const defaultBackendPort = 3010;
const requestTimeoutMs = 1500;

// ─── ユーティリティ ──────────────────────────────────────────────

function parseNodeVersion(version) {
  const [major, minor, patch] = version
    .replace(/^v/, '')
    .split('.')
    .map(part => Number.parseInt(part, 10));
  return { major, minor, patch };
}

function isSupportedNodeVersion(version) {
  const { major, minor, patch } = parseNodeVersion(version);
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return false;
  if (major < 20 || major >= 23) return false;
  if (major === 20 && minor < 19) return false;
  return true;
}

function assertSupportedNodeVersion() {
  if (isSupportedNodeVersion(process.version)) return;
  process.stderr.write(
    [
      `Sivflow の開発環境は Node.js ${REQUIRED_NODE_RANGE} が必要です。`,
      `現在の Node.js は ${process.version} です。`,
      '',
      'PowerShell で次を実行してください:',
      '  nvm use 22.20.0',
    ].join('\n') + '\n'
  );
  process.exit(1);
}

function prefixOutput(label, chunk, stream) {
  const text = chunk.toString();
  for (const line of text.split(/\r?\n/)) {
    if (line) stream.write(`[${label}] ${line}\n`);
  }
}

function npmArgs(args) {
  return isWindows ? ['/d', '/c', 'npm', ...args] : args;
}

function parsePort(value, fallback) {
  const port = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
}

function runSync(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    env: process.env,
    shell: isWindows,
    ...options,
  });
}

/** バックグラウンドで npm ワークスペースを起動し、プロセスを返す */
function run(label, args, extraEnv = {}) {
  const child = spawn(npmCommand, npmArgs(args), {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: root,
    env: { ...process.env, ...extraEnv },
  });
  child.stdout.on('data', chunk => prefixOutput(label, chunk, process.stdout));
  child.stderr.on('data', chunk => prefixOutput(label, chunk, process.stderr));
  child.on('error', error => {
    process.stderr.write(`[${label}] 起動に失敗しました: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.on('exit', code => {
    if (code) {
      process.exitCode = code;
      process.stderr.write(`[${label}] 終了コード ${code} で終了しました。\n`);
    }
  });
  return child;
}

// ─── Docker Desktop 起動待機 ──────────────────────────────────────

function isDockerRunning() {
  const result = runSync('docker', ['info'], { stdio: 'ignore' });
  return result.status === 0;
}

function startDockerDesktopOnWindows() {
  const candidates = [
    'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
    `${process.env.LOCALAPPDATA}\\Docker\\Docker Desktop.exe`,
  ];
  for (const exe of candidates) {
    try {
      execFileSync('cmd', ['/c', 'start', '', exe], { stdio: 'ignore' });
      return true;
    } catch {
      // 次の候補を試す
    }
  }
  return false;
}

async function ensureDockerRunning() {
  if (isDockerRunning()) {
    process.stdout.write('[docker] Docker は既に起動しています。\n');
    return;
  }

  process.stdout.write('[docker] Docker Desktop が起動していません。自動起動を試みます...\n');

  if (isWindows) {
    startDockerDesktopOnWindows();
  } else {
    process.stderr.write('[docker] Docker を手動で起動してから再実行してください。\n');
    process.exit(1);
  }

  // Docker が起動するまで最大 90 秒待機
  const timeoutMs = 90_000;
  const intervalMs = 2_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(intervalMs);
    if (isDockerRunning()) {
      process.stdout.write('[docker] Docker Desktop が起動しました。\n');
      return;
    }
    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`[docker] 待機中... (${elapsed}s)\n`);
  }

  process.stderr.write('[docker] Docker Desktop の起動がタイムアウトしました。手動で起動してください。\n');
  process.exit(1);
}

// ─── docker compose ───────────────────────────────────────────────

function dockerComposeUp() {
  process.stdout.write('[docker] docker compose up -d を実行します...\n');
  const result = runSync('docker', ['compose', 'up', '-d'], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.stderr.write('[docker] docker compose up -d に失敗しました。\n');
    process.exit(result.status ?? 1);
  }
  process.stdout.write('[docker] PostgreSQL・Redis を起動しました。\n');
}

// ─── PostgreSQL 待機 ──────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isPortOpen(host, port) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(requestTimeoutMs);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

function isSivflowBackend(port) {
  return new Promise(resolve => {
    const request = http.get(
      {
        host: defaultBackendHost,
        port,
        path: '/graphql',
        timeout: requestTimeoutMs,
        headers: {
          accept: 'application/json',
        },
      },
      response => {
        let body = '';

        response.setEncoding('utf8');
        response.on('data', chunk => {
          if (body.length < 4096) {
            body += chunk;
          }
        });
        response.on('end', () => {
          const requestIdHeader = response.headers['x-request-id'];
          const requestId = Array.isArray(requestIdHeader)
            ? requestIdHeader[0]
            : requestIdHeader;

          resolve(
            typeof requestId === 'string' &&
              requestId.startsWith('affine:http:') &&
              body.includes('GRAPHQL_BAD_REQUEST')
          );
        });
      }
    );

    request.once('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.once('error', () => resolve(false));
  });
}

async function reuseOrFailIfBackendAlreadyRunning() {
  const port = parsePort(process.env.AFFINE_SERVER_PORT, defaultBackendPort);

  if (!(await isPortOpen(defaultBackendHost, port))) {
    return false;
  }

  const timeoutMs = 10_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isSivflowBackend(port)) {
      process.stdout.write(
        `[backend] Sivflow backend is already running at http://${defaultBackendHost}:${port}.\n`
      );
      return true;
    }

    await sleep(500);
  }

  process.stderr.write(
    [
      `[backend] Port ${port} is already in use, but it does not look like a Sivflow backend.`,
      '[backend] そのプロセスを停止するか、AFFINE_SERVER_PORT を変更してから再実行してください。',
    ].join('\n') + '\n'
  );
  process.exit(1);
}

async function waitForPostgres(timeoutMs = 90_000) {
  const start = Date.now();
  process.stdout.write('[postgres] PostgreSQL の起動を待機しています...\n');
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen('127.0.0.1', 5432)) {
      // ポートが開いていてもコンテナ内 postgres が完全起動していない場合があるので
      // docker exec で SELECT 1 を実行して確認
      const probe = runSync(
        'docker',
        ['compose', 'exec', '-T', 'postgres', 'psql',
          'postgresql://sivflow:sivflow@localhost:5432/sivflow',
          '-c', 'select 1;'],
        { stdio: 'ignore' }
      );
      if (probe.status === 0) {
        process.stdout.write('[postgres] PostgreSQL が起動しました。\n');
        return;
      }
    }
    await sleep(2000);
  }
  process.stderr.write('[postgres] PostgreSQL の起動がタイムアウトしました。\n');
  process.exit(1);
}

// ─── DB マイグレーション ──────────────────────────────────────────

function runMigrations() {
  process.stdout.write('[migrate] DB マイグレーションを適用します...\n');
  const result = runSync(
    process.execPath,
    [path.join(root, 'scripts', 'apply-postgres-migrations.mjs')],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) {
    process.stderr.write('[migrate] マイグレーションに失敗しました。\n');
    process.exit(result.status ?? 1);
  }
  process.stdout.write('[migrate] マイグレーション完了。\n');
}

// ─── メイン ──────────────────────────────────────────────────────

assertSupportedNodeVersion();

await ensureDockerRunning();
dockerComposeUp();
await waitForPostgres();
runMigrations();

process.stdout.write('[sivflow] バックエンドとフロントエンドを起動します...\n');
const backendAlreadyRunning = await reuseOrFailIfBackendAlreadyRunning();
if (!backendAlreadyRunning) {
  run('backend', ['--workspace', '@affine/server', 'run', 'dev']);
}
run('web', ['--workspace', '@affine/web', 'run', 'dev'], {
  SIVFLOW_ENABLE_BACKEND: 'true',
});
