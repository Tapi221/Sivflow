import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import type { BuildContext } from 'esbuild';
import * as esbuild from 'esbuild';
import kill from 'tree-kill';

import { config, electronDir, rootDir } from './common';

// this means we don't spawn electron windows, mainly for testing
const watchMode = process.argv.includes('--watch');
const rendererDevWorkspace =
  process.env.ELECTRON_RENDERER_DEV_WORKSPACE ?? '@affine/web';
const rendererDevScript = process.env.ELECTRON_RENDERER_DEV_SCRIPT ?? 'dev';
const rendererLogPrefix =
  process.env.ELECTRON_RENDERER_LOG_PREFIX ??
  (rendererDevWorkspace === '@affine/web' ? '[web]' : '[renderer]');
const backendLogPrefix = process.env.ELECTRON_BACKEND_LOG_PREFIX ?? '[backend]';
const requiredNodeVersion = '22.20.0';
const requireBackendDevServer = process.env.ELECTRON_REQUIRE_BACKEND === 'true';

process.env.DEV_SERVER_URL ??= 'http://127.0.0.1:8080';
process.env.ELECTRON_BACKEND_DEV_SERVER_URL ??= 'http://127.0.0.1:3010';

/** Messages on stderr that match any of the contained patterns will be stripped from output */
const stderrFilterPatterns = [
  // warning about devtools extension
  // https://github.com/cawa-93/vite-electron-builder/issues/492
  // https://github.com/MarshallOfSound/electron-devtools-installer/issues/143
  /ExtensionLoadWarning/,
];

let spawnProcess: ChildProcessWithoutNullStreams | null = null;
let backendDevProcess: ChildProcessWithoutNullStreams | null = null;
let webDevProcess: ChildProcessWithoutNullStreams | null = null;
let backendDevServerAvailable = false;
const intentionalStops = new WeakSet<ChildProcessWithoutNullStreams>();

function parseNodeVersion(version: string) {
  const [major, minor, patch] = version
    .replace(/^v/, '')
    .split('.')
    .map(part => Number.parseInt(part, 10));

  return { major, minor, patch };
}

function isSupportedNodeVersion(version: string) {
  const { major, minor, patch } = parseNodeVersion(version);

  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) {
    return false;
  }

  return major === 22 && minor === 20 && patch === 0;
}

function assertSupportedNodeVersion() {
  if (isSupportedNodeVersion(process.version)) {
    return;
  }

  process.stderr.write(
    [
      `Sivflow の開発環境は Node.js ${requiredNodeVersion} が必要です。`,
      `現在の Node.js は ${process.version} です。`,
      '',
      'PowerShell で次を実行してください:',
      '  nvm use 22.20.0',
      '  where.exe node',
      '  node -v',
      '',
      'node -v が v24.x のままなら、別の Node が PATH で優先されています。',
    ].join('\n') + '\n'
  );
  process.exit(1);
}

function pipeProcessOutput(
  processToPipe: ChildProcessWithoutNullStreams,
  options: { prefix?: string; filterStderr?: boolean } = {}
) {
  const { prefix = '', filterStderr = false } = options;
  const format = (value: Buffer) => {
    const str = value.toString().trim();
    return prefix && str ? `${prefix} ${str}` : str;
  };

  processToPipe.stdout.on('data', d => {
    const str = format(d);
    if (str) {
      console.log(str);
    }
  });

  processToPipe.stderr.on('data', d => {
    const data = format(d);
    if (!data) return;
    const mayIgnore =
      filterStderr && stderrFilterPatterns.some(r => r.test(data));
    if (mayIgnore) return;
    console.error(data);
  });
}

function stopSpawnedProcess(
  processToStop: ChildProcessWithoutNullStreams,
  label: string
) {
  if (!processToStop.pid) {
    return Promise.resolve();
  }

  intentionalStops.add(processToStop);

  return new Promise<void>(resolve => {
    const timeout = setTimeout(resolve, 5000);

    processToStop.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    kill(processToStop.pid!, err => {
      if (err) {
        clearTimeout(timeout);
        console.error(`${label} の停止に失敗しました`, err);
        resolve();
      }
    });
  });
}

function cleanupProcesses() {
  if (spawnProcess?.pid) {
    intentionalStops.add(spawnProcess);
    kill(spawnProcess.pid);
  }

  if (webDevProcess?.pid) {
    intentionalStops.add(webDevProcess);
    kill(webDevProcess.pid);
  }

  if (backendDevProcess?.pid) {
    intentionalStops.add(backendDevProcess);
    kill(backendDevProcess.pid);
  }
}

process.once('SIGINT', () => {
  cleanupProcesses();
  process.exit();
});

process.once('SIGTERM', () => {
  cleanupProcesses();
  process.exit();
});

async function spawnOrReloadElectron() {
  if (watchMode) {
    return;
  }
  if (spawnProcess !== null) {
    await stopSpawnedProcess(spawnProcess, 'Electron');
    spawnProcess = null;
  }

  const ext = process.platform === 'win32' ? '.cmd' : '';
  const exe = resolve(rootDir, 'node_modules', '.bin', `electron${ext}`);

  // remove import loader option
  const env = { ...process.env };
  const NODE_OPTIONS = env.NODE_OPTIONS;
  if (NODE_OPTIONS) {
    env.NODE_OPTIONS = NODE_OPTIONS.replace(/--import=[^\s]*/, '');
  }

  const inspectArg = process.env.ELECTRON_INSPECT_PORT
    ? `--inspect=${process.env.ELECTRON_INSPECT_PORT}`
    : '--inspect=0';

  const electronProcess = spawn(exe, ['.', inspectArg], {
    cwd: electronDir,
    env,
    shell: true,
  });
  spawnProcess = electronProcess;

  pipeProcessOutput(electronProcess, { filterStderr: true });

  // Stops the watch script when the application has quit
  electronProcess.on('exit', code => {
    if (spawnProcess === electronProcess) {
      spawnProcess = null;
    }

    if (!intentionalStops.has(electronProcess) && code && code !== 0) {
      console.log(`Electron はコード ${code} で終了しました`);
    }
  });
}

async function isWebDevServerReachable(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const body = await response.text();
    return (
      body.includes('/@vite/client') && body.includes('<title>Sivflow</title>')
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function isBackendDevServerReachable(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(new URL('/graphql', baseUrl), {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    const body = await response.text();
    const requestId = response.headers.get('x-request-id');

    return Boolean(
      requestId?.startsWith('affine:http:') &&
        body.includes('GRAPHQL_BAD_REQUEST')
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function spawnBackendDevServer() {
  if (backendDevProcess !== null) {
    return;
  }

  const node = process.execPath;
  const backendDevScriptPath = resolve(
    rootDir,
    'packages',
    'backend',
    'server',
    'scripts',
    'dev.mjs'
  );
  const currentBackendDevProcess = spawn(node, [backendDevScriptPath], {
    cwd: rootDir,
    env: process.env,
    shell: false,
  });
  backendDevProcess = currentBackendDevProcess;

  pipeProcessOutput(currentBackendDevProcess, { prefix: backendLogPrefix });

  currentBackendDevProcess.on('exit', code => {
    if (backendDevProcess === currentBackendDevProcess) {
      backendDevProcess = null;
    }

    if (!intentionalStops.has(currentBackendDevProcess) && code && code !== 0) {
      console.log(
        `Backend 開発サーバーはコード ${code} で終了しました。` +
          '/graphql と /api/auth/session は 3010 に接続できません。'
      );
    }
  });
}

function spawnWebDevServer() {
  if (webDevProcess !== null) {
    return;
  }

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const env = { ...process.env };
  const backendServerBase = process.env.ELECTRON_BACKEND_DEV_SERVER_URL;

  if (backendDevServerAvailable && backendServerBase) {
    env.SIVFLOW_ENABLE_BACKEND = 'true';
    env.AFFINE_ENABLE_BACKEND = 'true';
    env.SIVFLOW_BACKEND_URL = backendServerBase;
    env.AFFINE_BACKEND_URL = backendServerBase;
  } else {
    delete env.SIVFLOW_ENABLE_BACKEND;
    delete env.AFFINE_ENABLE_BACKEND;
    delete env.SIVFLOW_BACKEND_URL;
    delete env.AFFINE_BACKEND_URL;
  }

  const currentWebDevProcess = spawn(
    npm,
    ['--workspace', rendererDevWorkspace, 'run', rendererDevScript],
    {
      cwd: rootDir,
      env,
      shell: true,
    }
  );
  webDevProcess = currentWebDevProcess;

  pipeProcessOutput(currentWebDevProcess, { prefix: rendererLogPrefix });

  currentWebDevProcess.on('exit', code => {
    if (webDevProcess === currentWebDevProcess) {
      webDevProcess = null;
    }

    if (!intentionalStops.has(currentWebDevProcess) && code && code !== 0) {
      console.log(`Web 開発サーバーはコード ${code} で終了しました`);
    }
  });
}

async function ensureBackendDevServer() {
  const backendServerBase = process.env.ELECTRON_BACKEND_DEV_SERVER_URL;
  if (
    !backendServerBase ||
    (await isBackendDevServerReachable(backendServerBase))
  ) {
    backendDevServerAvailable = Boolean(backendServerBase);
    return backendDevServerAvailable;
  }

  console.log(
    `Backend 開発サーバーが見つからないため ${backendServerBase} を起動しています...`
  );
  spawnBackendDevServer();

  const timeoutMs = Number(process.env.BACKEND_DEV_SERVER_WAIT_TIMEOUT_MS ?? 300000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isBackendDevServerReachable(backendServerBase)) {
      backendDevServerAvailable = true;
      console.log(`Backend 開発サーバーに接続しました: ${backendServerBase}`);
      return true;
    }

    await delay(500);
  }

  backendDevServerAvailable = false;

  const message =
    `Backend 開発サーバー ${backendServerBase} に接続できませんでした。` +
    (requireBackendDevServer
      ? '別ターミナルで npm run dev:backend を起動してから再実行してください。'
      : 'backend なしで Electron / Web 開発サーバーを起動します。API を使う機能は利用できません。');

  if (requireBackendDevServer) {
    throw new Error(message);
  }

  console.warn(message);
  return false;
}

async function ensureBackendDevServerIfPossible() {
  try {
    return await ensureBackendDevServer();
  } catch (error) {
    if (requireBackendDevServer) {
      throw error;
    }

    backendDevServerAvailable = false;
    console.warn(
      `Backend 起動をスキップします: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

async function ensureWebDevServer() {
  if (backendDevServerAvailable) {
    console.log('Backend が利用可能なため Web 開発サーバーの API proxy を有効にします。');
  } else {
    console.log('Backend なしで Web 開発サーバーを起動します。');
  }

  await ensureDevServer();
}

async function startElectronDev() {
  await ensureBackendDevServerIfPossible();
  await ensureWebDevServer();
  await spawnOrReloadElectron();
}

async function ensureDevServer() {
  const devServerBase = process.env.DEV_SERVER_URL;
  if (!devServerBase || (await isWebDevServerReachable(devServerBase))) {
    return;
  }

  console.log(
    `Web 開発サーバーが見つからないため ${devServerBase} を起動しています...`
  );
  spawnWebDevServer();

  const timeoutMs = Number(process.env.DEV_SERVER_WAIT_TIMEOUT_MS ?? 120000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isWebDevServerReachable(devServerBase)) {
      console.log(`Web 開発サーバーに接続しました: ${devServerBase}`);
      return;
    }

    await delay(500);
  }

  throw new Error(
    `Web 開発サーバー ${devServerBase} に接続できませんでした。` +
      `別ターミナルで npm --workspace ${rendererDevWorkspace} run ${rendererDevScript} を起動してから再実行してください。`
  );
}

assertSupportedNodeVersion();

const common = config();

async function watchLayers() {
  let initialBuild = false;
  return new Promise<BuildContext>(resolve => {
    const buildContextPromise = esbuild.context({
      ...common,
      plugins: [
        ...(common.plugins ?? []),
        {
          name: 'electron-dev:reload-app-on-layers-change',
          setup(build) {
            build.onEnd(() => {
              if (initialBuild) {
                console.log(`[layers] 変更を検出しました。Electron を再起動しています...`);
                spawnOrReloadElectron().catch(e => {
                  console.error(e);
                });
              } else {
                buildContextPromise.then(resolve).catch(e => {
                  console.error(e);
                });
                initialBuild = true;
              }
            });
          },
        },
      ],
    });
    buildContextPromise
      .then(buildContext => {
        return buildContext.watch();
      })
      .catch(e => {
        console.error(e);
      });
  });
}

await watchLayers();

if (watchMode) {
  console.log(`変更を監視しています...`);
} else {
  console.log('Electron を起動しています...');
  await startElectronDev();
  console.log(`Electron を起動しました。変更を監視しています...`);
}
