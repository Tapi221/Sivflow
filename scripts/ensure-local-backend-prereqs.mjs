import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultDatabaseUrl =
  'postgresql://sivflow:sivflow@localhost:5432/sivflow?schema=public';
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  POSTGRES_HOST: process.env.POSTGRES_HOST ?? 'localhost',
  POSTGRES_PORT: process.env.POSTGRES_PORT ?? '5432',
  REDIS_SERVER_HOST: process.env.REDIS_SERVER_HOST ?? 'localhost',
  REDIS_SERVER_PORT: process.env.REDIS_SERVER_PORT ?? '6379',
};

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: rootDir,
    env,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  });
}

function dockerComposeAvailable() {
  return run('docker', ['compose', 'version']).status === 0;
}

function portFromEnv(name, fallback) {
  const raw = env[name];
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function canConnect(host, port, timeoutMs = 1500) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    let finished = false;

    const finish = ok => {
      if (finished) {
        return;
      }

      finished = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function checkServices() {
  const postgres = {
    label: 'PostgreSQL',
    host: env.POSTGRES_HOST,
    port: portFromEnv('POSTGRES_PORT', 5432),
  };
  const redis = {
    label: 'Redis',
    host: env.REDIS_SERVER_HOST,
    port: portFromEnv('REDIS_SERVER_PORT', 6379),
  };

  return await Promise.all(
    [postgres, redis].map(async service => ({
      ...service,
      ok: await canConnect(service.host, service.port),
    }))
  );
}

async function waitForServices(timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const results = await checkServices();
    if (results.every(result => result.ok)) {
      return results;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return await checkServices();
}

function printResults(results) {
  for (const result of results) {
    console.log(
      `[Sivflow] ${result.label}: ${result.ok ? 'OK' : 'NG'} (${result.host}:${result.port})`
    );
  }
}

let results = await checkServices();
const missing = results.filter(result => !result.ok);

if (missing.length > 0) {
  if (!dockerComposeAvailable()) {
    printResults(results);
    console.error('');
    console.error(
      '[Sivflow] PostgreSQL / Redis が起動しておらず、docker compose も利用できません。'
    );
    process.exit(1);
  }

  console.log(
    '[Sivflow] PostgreSQL / Redis が見つからないため docker compose で起動しています...'
  );
  const composeResult = run('docker', [
    'compose',
    'up',
    '-d',
    'postgres',
    'redis',
  ], {
    stdio: 'inherit',
  });
  if (composeResult.status !== 0) {
    process.exit(composeResult.status ?? 1);
  }

  results = await waitForServices(90000);
  if (results.some(result => !result.ok)) {
    printResults(results);
    console.error('');
    console.error(
      '[Sivflow] docker compose で起動しましたが PostgreSQL / Redis に接続できません。'
    );
    process.exit(1);
  }
}

printResults(results);
console.log('[Sivflow] PostgreSQL migration を確認しています...');

const migrateResult = run(process.execPath, [
  path.join(rootDir, 'scripts', 'apply-postgres-migrations.mjs'),
], {
  stdio: 'inherit',
  shell: false,
});

if (migrateResult.status !== 0) {
  process.exit(migrateResult.status ?? 1);
}

