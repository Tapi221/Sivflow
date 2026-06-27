import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const heapSizeMb = process.env.SIVFLOW_BUILD_HEAP_MB || '6144';
const viteBin = fileURLToPath(import.meta.resolve('vite/bin/vite.js'));
const viteArgs = process.argv.slice(2);

const child = spawn(
  process.execPath,
  [`--max-old-space-size=${heapSizeMb}`, viteBin, 'build', ...viteArgs],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  }
);

child.on('error', error => {
  console.error('Vite ビルドの起動に失敗しました:', error);
  process.exit(1);
});

child.on('exit', code => {
  process.exit(code ?? 1);
});
