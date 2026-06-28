import { spawn } from 'node:child_process';
import process from 'node:process';

const REQUIRED_NODE_RANGE = '>=20.19.0 <23.0.0';
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
let failed = false;

function parseNodeVersion(version) {
  const [major, minor, patch] = version
    .replace(/^v/, '')
    .split('.')
    .map(part => Number.parseInt(part, 10));

  return { major, minor, patch };
}

function isSupportedNodeVersion(version) {
  const { major, minor, patch } = parseNodeVersion(version);

  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) {
    return false;
  }

  if (major < 20 || major >= 23) {
    return false;
  }

  if (major === 20 && minor < 19) {
    return false;
  }

  return true;
}

function assertSupportedNodeVersion() {
  if (isSupportedNodeVersion(process.version)) {
    return;
  }

  process.stderr.write(
    [
      `Sivflow の開発環境は Node.js ${REQUIRED_NODE_RANGE} が必要です。`,
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

function prefixOutput(label, chunk, stream) {
  const text = chunk.toString();
  for (const line of text.split(/\r?\n/)) {
    if (line) stream.write(`[${label}] ${line}\n`);
  }
}

function npmArgs(args) {
  return isWindows ? ['/d', '/c', 'npm', ...args] : args;
}

function run(label, args, extraEnv = {}) {
  const child = spawn(npmCommand, npmArgs(args), {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  child.stdout.on('data', chunk => prefixOutput(label, chunk, process.stdout));
  child.stderr.on('data', chunk => prefixOutput(label, chunk, process.stderr));
  child.on('error', error => {
    failed = true;
    process.stderr.write(`[${label}] 起動に失敗しました: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.on('exit', code => {
    if (code && !failed) {
      failed = true;
      process.exitCode = code;
      process.stderr.write(
        `[${label}] が終了コード ${code} で終了しました。backend が落ちると /graphql と /api/auth/session は 3010 に接続できません。\n`
      );
    }
  });
}

assertSupportedNodeVersion();

run('backend', ['--workspace', '@affine/server', 'run', 'dev']);
run('web', ['--workspace', '@affine/web', 'run', 'dev'], {
  SIVFLOW_ENABLE_BACKEND: 'true',
});
