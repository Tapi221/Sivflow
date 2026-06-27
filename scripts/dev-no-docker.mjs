import { spawn } from 'node:child_process';
import process from 'node:process';

const backendUrl = 'http://127.0.0.1:3010';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('[Sivflow] Docker / PostgreSQL / Redis なしの画面確認モードで起動します。');
console.log('[Sivflow] クラウド同期・認証・AI・管理機能はモック応答になります。');
console.log(`[Sivflow] Offline backend: ${backendUrl}`);

const backend = spawn(process.execPath, ['scripts/dev-offline-backend.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: '3010',
  },
});

const web = spawn(npmCommand, ['run', 'dev:web'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SIVFLOW_BACKEND_URL: backendUrl,
  },
});

let shuttingDown = false;

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (!backend.killed) backend.kill('SIGINT');
  if (!web.killed) web.kill('SIGINT');

  setTimeout(() => process.exit(exitCode), 300);
}

backend.on('exit', code => {
  if (!shuttingDown) {
    console.error(`[Sivflow] Offline backend が終了しました。code=${code ?? 'null'}`);
    stopAll(code ?? 1);
  }
});

web.on('exit', code => {
  stopAll(code ?? 0);
});

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
