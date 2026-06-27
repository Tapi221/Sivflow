import { spawn } from 'node:child_process';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const child = spawn(npmCommand, ['--workspace', '@affine/web', 'run', 'dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SIVFLOW_ENABLE_BACKEND: 'true',
  },
});

child.on('exit', code => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => {
  if (!child.killed) child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  if (!child.killed) child.kill('SIGTERM');
});
