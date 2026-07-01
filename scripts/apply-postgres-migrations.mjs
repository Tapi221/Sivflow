import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runDockerCommand } from './docker-api-fallback.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'functions', 'db', 'migrations');
const backendServerDir = path.join(root, 'packages', 'backend', 'server');
const prismaSchemaPath = path.join(backendServerDir, 'schema.prisma');
const prismaCliPath = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
const rawDatabaseUrl = process.env.DATABASE_URL ?? '';
const defaultConnectionUrl =
  'postgresql://sivflow:sivflow@127.0.0.1:5432/sivflow';

function toPsqlConnectionUrl(value) {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(value);
    url.searchParams.delete('schema');
    return url.toString();
  } catch {
    return value;
  }
}

const files = fs.existsSync(migrationsDir)
  ? fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
  : [];

const connectionUrl = toPsqlConnectionUrl(rawDatabaseUrl);
const defaultArgs = ['-h', '127.0.0.1', '-p', '5432', '-U', 'sivflow', '-d', 'sivflow'];
const connectionArgs = connectionUrl ? [connectionUrl] : defaultArgs;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    env: process.env,
    shell: process.platform === 'win32',
    ...options,
  });
}

function canSpeakPostgres(host, port, timeoutMs = 1500) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    let done = false;

    const finish = ok => {
      if (done) {
        return;
      }

      done = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      const sslRequest = Buffer.alloc(8);
      sslRequest.writeInt32BE(8, 0);
      sslRequest.writeInt32BE(80877103, 4);
      socket.write(sslRequest);
    });
    socket.once('data', chunk => {
      const reply = chunk.subarray(0, 1).toString('utf8');
      finish(reply === 'S' || reply === 'N');
    });
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.once('close', () => finish(false));
  });
}

function runDocker(args, options = {}) {
  return runDockerCommand(args, {
    cwd: root,
    env: process.env,
    shell: process.platform === 'win32',
    logPrefix: '[Sivflow]',
    ...options,
  });
}

function hasLocalPsql() {
  const result = run('psql', ['--version'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function hasDockerCompose() {
  const result = runDocker(['compose', 'version'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function applyMigrationWithLocalPsql(fullPath) {
  return run('psql', [...connectionArgs, '-v', 'ON_ERROR_STOP=1', '-f', fullPath], {
    stdio: 'inherit',
  });
}

function applyMigrationWithDocker(fullPath) {
  return runDocker(
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'psql',
      connectionUrl || defaultConnectionUrl,
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      '-',
    ],
    {
      input: fs.readFileSync(fullPath),
      stdio: ['pipe', 'inherit', 'inherit'],
    }
  );
}

function runPrismaDbPush() {
  if (!fs.existsSync(prismaSchemaPath)) {
    console.error(`[Sivflow] Prisma schema が見つかりません: ${prismaSchemaPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(prismaCliPath)) {
    console.error(`[Sivflow] Prisma CLI が見つかりません: ${prismaCliPath}`);
    process.exit(1);
  }

  return run(
    process.execPath,
    [
      prismaCliPath,
      'db',
      'push',
      '--skip-generate',
      '--schema',
      prismaSchemaPath,
    ],
    {
      cwd: root,
      shell: false,
      stdio: 'inherit',
    }
  );
}

function postgresReadyProbe() {
  if (useLocalPsql) {
    return run('psql', [...connectionArgs, '-c', 'select 1;'], {
      stdio: 'ignore',
    });
  }

  return runDocker(
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'psql',
      connectionUrl || defaultConnectionUrl,
      '-c',
      'select 1;',
    ],
    {
      stdio: 'ignore',
    }
  );
}

async function waitForPostgresReady(timeoutMs = 90000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!needsSqlRunner) {
      if (await canSpeakPostgres('127.0.0.1', 5432)) {
        return true;
      }
    } else {
      const result = postgresReadyProbe();
      if (result.status === 0) {
        return true;
      }
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }

  return false;
}

const needsSqlRunner = files.length > 0;
const useLocalPsql = hasLocalPsql();
const useDockerCompose = needsSqlRunner && !useLocalPsql && hasDockerCompose();

if (needsSqlRunner && !useLocalPsql && !useDockerCompose) {
  console.error(
    '[Sivflow] psql コマンドが見つからず、docker compose も利用できません。'
  );
  process.exit(1);
}

if (!(await waitForPostgresReady())) {
  console.error('[Sivflow] PostgreSQL の起動完了を待機しましたが、接続できませんでした。');
  process.exit(1);
}

for (const file of files) {
  const fullPath = path.join(migrationsDir, file);
  console.log(`[Sivflow] PostgreSQL migrationを実行します: ${file}`);

  const result = useLocalPsql
    ? applyMigrationWithLocalPsql(fullPath)
    : applyMigrationWithDocker(fullPath);

  if (result.status !== 0) {
    console.error('[Sivflow] PostgreSQL migrationに失敗しました。psqlコマンドとDATABASE_URLを確認してください。');
    process.exit(result.status ?? 1);
  }
}

if (files.length === 0) {
  console.log('[Sivflow] 実行する functions/db SQL migration はありません。');
}

console.log('[Sivflow] Prisma schema を PostgreSQL に同期します...');
const prismaPushResult = runPrismaDbPush();

if (prismaPushResult.status !== 0) {
  console.error('[Sivflow] Prisma schema の同期に失敗しました。DATABASE_URL と schema.prisma を確認してください。');
  process.exit(prismaPushResult.status ?? 1);
}

console.log('[Sivflow] PostgreSQL migrationが完了しました。');
