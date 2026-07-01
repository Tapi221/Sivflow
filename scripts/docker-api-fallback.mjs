import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const dockerApiVersionPatterns = [
  /\/v(?<major>\d+)\.(?<minor>\d+)\//i,
  /\bAPI version(?:\s*[:=]|\s+)(?<major>\d+)\.(?<minor>\d+)/i,
];

function toText(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  return '';
}

function isDockerApiVersionMismatch(output) {
  return (
    /requested API version/i.test(output) ||
    /client version .* is too new/i.test(output)
  );
}

function extractDockerApiVersion(output) {
  for (const pattern of dockerApiVersionPatterns) {
    const match = output.match(pattern);
    const major = Number.parseInt(match?.groups?.major ?? '', 10);
    const minor = Number.parseInt(match?.groups?.minor ?? '', 10);

    if (Number.isInteger(major) && Number.isInteger(minor)) {
      return `${major}.${minor}`;
    }
  }

  return null;
}

function previousDockerApiVersion(version) {
  const [majorText, minorText] = String(version).split('.');
  const major = Number.parseInt(majorText ?? '', 10);
  const minor = Number.parseInt(minorText ?? '', 10);

  if (!Number.isInteger(major) || !Number.isInteger(minor) || minor <= 0) {
    return null;
  }

  return `${major}.${minor - 1}`;
}

function replayCapturedOutput(result, stdio) {
  const stdout = toText(result.stdout);
  const stderr = toText(result.stderr);

  if (stdio === 'inherit') {
    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stderr.write(stderr);
    }
    return;
  }

  if (!Array.isArray(stdio)) {
    return;
  }

  if (stdio[1] === 'inherit' && stdout) {
    process.stdout.write(stdout);
  }

  if (stdio[2] === 'inherit' && stderr) {
    process.stderr.write(stderr);
  }
}

export function runDockerCommand(args, options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    encoding = 'utf8',
    shell = process.platform === 'win32',
    stdio = 'pipe',
    logPrefix = '[docker]',
    maxApiFallbackAttempts = 6,
    ...rest
  } = options;

  const runOnce = currentEnv =>
    spawnSync('docker', args, {
      cwd,
      env: currentEnv,
      encoding,
      shell,
      stdio: 'pipe',
      ...rest,
    });

  let result = runOnce(env);
  let output = `${toText(result.stdout)}\n${toText(result.stderr)}`;

  if (result.status === 0 || !isDockerApiVersionMismatch(output)) {
    replayCapturedOutput(result, stdio);
    return result;
  }

  let currentVersion =
    extractDockerApiVersion(output) ?? env.DOCKER_API_VERSION ?? null;

  for (let attempt = 0; attempt < maxApiFallbackAttempts; attempt += 1) {
    currentVersion = previousDockerApiVersion(currentVersion);
    if (!currentVersion) {
      break;
    }

    console.warn(
      `${logPrefix} Docker API ${currentVersion} で再試行しています...`
    );

    const nextEnv = {
      ...env,
      DOCKER_API_VERSION: currentVersion,
    };
    const retried = runOnce(nextEnv);
    result = retried;
    output = `${toText(retried.stdout)}\n${toText(retried.stderr)}`;

    if (retried.status === 0) {
      env.DOCKER_API_VERSION = currentVersion;
      process.env.DOCKER_API_VERSION = currentVersion;
      replayCapturedOutput(retried, stdio);
      return retried;
    }

    if (!isDockerApiVersionMismatch(output)) {
      break;
    }
  }

  replayCapturedOutput(result, stdio);
  return result;
}

function dockerDesktopExeCandidates() {
  return [
    'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
    path.join(
      process.env.LOCALAPPDATA ?? '',
      'Docker',
      'Docker Desktop.exe'
    ),
  ].filter(Boolean);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    encoding: options.encoding ?? 'utf8',
    shell: options.shell ?? process.platform === 'win32',
    stdio: options.stdio ?? 'pipe',
    timeout: options.timeout,
  });
}

function dockerDaemonVersion(options = {}) {
  const result = run('docker', ['version', '--format', '{{.Server.Version}}'], {
    ...options,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: options.timeout ?? 5000,
  });

  return {
    ...result,
    serverVersion: toText(result.stdout).trim(),
  };
}

function dockerDesktopServiceStopped() {
  if (process.platform !== 'win32') {
    return false;
  }

  const result = run('sc', ['query', 'com.docker.service'], {
    shell: false,
    timeout: 5000,
  });
  const output = `${toText(result.stdout)}\n${toText(result.stderr)}`;
  return /STATE\s*:\s*1\s+STOPPED/i.test(output);
}

function launchDockerDesktop({ elevated = false, logPrefix = '[docker]' } = {}) {
  const candidates = dockerDesktopExeCandidates();

  for (const exe of candidates) {
    const args = elevated
      ? [
          '-NoProfile',
          '-Command',
          `Start-Process -FilePath '${exe.replace(/'/g, "''")}' -Verb RunAs`,
        ]
      : [];
    const command = elevated ? 'powershell.exe' : exe;
    const commandArgs = elevated ? args : [];
    const result = elevated
      ? run(command, commandArgs, {
          shell: false,
          timeout: 15000,
        })
      : (() => {
          try {
            const child = process.platform === 'win32'
              ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'start', '', `"${exe}"`], {
                  encoding: 'utf8',
                  shell: false,
                  stdio: 'ignore',
                  timeout: 10000,
                })
              : null;
            return child ?? { status: 1, stdout: '', stderr: 'unsupported platform' };
          } catch (error) {
            return {
              status: 1,
              stdout: '',
              stderr: error instanceof Error ? error.message : String(error),
            };
          }
        })();

    if ((result.status ?? 1) === 0) {
      return true;
    }
  }

  console.error(
    `${logPrefix} Docker Desktop を起動できませんでした。手動で起動してください。`
  );
  return false;
}

export async function ensureDockerDaemonRunning({
  logPrefix = '[docker]',
  timeoutMs = 240000,
  intervalMs = 5000,
} = {}) {
  const initial = dockerDaemonVersion();
  if (initial.status === 0 && initial.serverVersion) {
    return true;
  }

  if (process.platform === 'win32') {
    if (dockerDesktopServiceStopped()) {
      console.log(
        `${logPrefix} Docker Desktop service が停止しています。管理者権限で起動を試みます...`
      );
      if (!launchDockerDesktop({ elevated: true, logPrefix })) {
        return false;
      }
    } else {
      console.log(
        `${logPrefix} Docker daemon が見つからないため Docker Desktop を起動しています...`
      );
      if (!launchDockerDesktop({ elevated: false, logPrefix })) {
        return false;
      }
    }
  } else {
    console.error(
      `${logPrefix} Docker daemon が起動していません。手動で起動してから再実行してください。`
    );
    return false;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = dockerDaemonVersion();
    if (result.status === 0 && result.serverVersion) {
      console.log(`${logPrefix} Docker daemon に接続しました。`);
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  console.error(
    `${logPrefix} Docker daemon の起動待機がタイムアウトしました。Docker Desktop を開いて Engine running を確認してください。`
  );
  return false;
}
