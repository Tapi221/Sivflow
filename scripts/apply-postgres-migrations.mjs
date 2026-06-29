import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'functions', 'db', 'migrations');
const rawDatabaseUrl = process.env.DATABASE_URL ?? '';
const defaultConnectionUrl =
  'postgresql://sivflow:sivflow@localhost:5432/sivflow';

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

if (!fs.existsSync(migrationsDir)) {
  console.error(`[Sivflow] migrationディレクトリが見つかりません: ${migrationsDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('[Sivflow] 実行するPostgreSQL migrationはありません。');
  process.exit(0);
}

const connectionUrl = toPsqlConnectionUrl(rawDatabaseUrl);
const defaultArgs = ['-h', 'localhost', '-p', '5432', '-U', 'sivflow', '-d', 'sivflow'];
const connectionArgs = connectionUrl ? [connectionUrl] : defaultArgs;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    env: process.env,
    shell: process.platform === 'win32',
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
  const result = run('docker', ['compose', 'version'], {
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
  return run(
    'docker',
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

function postgresReadyProbe() {
  if (useLocalPsql) {
    return run('psql', [...connectionArgs, '-c', 'select 1;'], {
      stdio: 'ignore',
    });
  }

  return run(
    'docker',
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

function waitForPostgresReady(timeoutMs = 90000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = postgresReadyProbe();
    if (result.status === 0) {
      return true;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }

  return false;
}

const useLocalPsql = hasLocalPsql();
const useDockerCompose = !useLocalPsql && hasDockerCompose();

if (!useLocalPsql && !useDockerCompose) {
  console.error(
    '[Sivflow] psql コマンドが見つからず、docker compose も利用できません。'
  );
  process.exit(1);
}

if (!waitForPostgresReady()) {
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

console.log('[Sivflow] PostgreSQL migrationが完了しました。');
