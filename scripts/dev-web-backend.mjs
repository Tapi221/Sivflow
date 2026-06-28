import { spawn } from 'node:child_process';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function prefixOutput(label, chunk, stream) {
  const text = chunk.toString();
  for (const line of text.split(/\r?\n/)) {
    if (line) stream.write(`[${label}] ${line}\n`);
  }
}

function run(label, args, extraEnv = {}) {
  const child = spawn(npmCommand, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  child.stdout.on('data', chunk => prefixOutput(label, chunk, process.stdout));
  child.stderr.on('data', chunk => prefixOutput(label, chunk, process.stderr));
}

run('backend', ['--workspace', '@affine/server', 'run', 'dev']);
run('web', ['--workspace', '@affine/web', 'run', 'dev'], {
  SIVFLOW_ENABLE_BACKEND: 'true',
});
