import { spawn } from 'node:child_process';

const [major = 0, minor = 0] = process.versions.node
  .split('.')
  .map(part => Number(part));

const supported = (major === 20 && minor >= 19) || major === 21 || major === 22;

if (!supported) {
  console.error(`Node.js ${process.version} は Sivflow の対応範囲外です。`);
  console.error('対応範囲は >=20.19.0 <23.0.0 です。');
  console.error('nvm use 22.20.0 を実行してから npm install をやり直してください。');
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const children = new Set();

function args(items) {
  return isWindows ? ['/d', '/c', 'npm', ...items] : items;
}

function write(label, chunk, stream) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line) stream.write(`[${label}] ${line}\n`);
  }
}

function stopAll() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

function run(label, items, env = {}) {
  const child = spawn(command, args(items), {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });

  children.add(child);
  child.stdout.on('data', chunk => write(label, chunk, process.stdout));
  child.stderr.on('data', chunk => write(label, chunk, process.stderr));
  child.on('error', error => {
    console.error(`[${label}] 起動に失敗しました: ${error.message}`);
    stopAll();
  });
  child.on('exit', code => {
    children.delete(child);
    if (code) {
      console.error(`[${label}] コード ${code} で終了しました。開発起動を停止します。`);
      stopAll();
      process.exitCode = code;
    }
  });
}

process.once('SIGINT', () => {
  stopAll();
  process.exit();
});

process.once('SIGTERM', () => {
  stopAll();
  process.exit();
});

run('backend', ['--workspace', '@affine/server', 'run', 'dev']);
run('web', ['--workspace', '@affine/web', 'run', 'dev'], {
  SIVFLOW_ENABLE_BACKEND: 'true',
});
