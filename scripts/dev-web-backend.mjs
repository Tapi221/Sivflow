import { spawn } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';

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
    process.stderr.write(`[${label}] 起動に失敗しました: ${error.message}\n`);
    process.exitCode = 1;
  });
}

run('backend', ['--workspace', '@affine/server', 'run', 'dev']);
run('web', ['--workspace', '@affine/web', 'run', 'dev'], {
  SIVFLOW_ENABLE_BACKEND: 'true',
});
