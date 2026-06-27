import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'functions', 'db', 'migrations');
const rawDatabaseUrl = process.env.DATABASE_URL ?? '';

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

for (const file of files) {
  const fullPath = path.join(migrationsDir, file);
  console.log(`[Sivflow] PostgreSQL migrationを実行します: ${file}`);

  const result = spawnSync(
    'psql',
    [...connectionArgs, '-v', 'ON_ERROR_STOP=1', '-f', fullPath],
    {
      cwd: root,
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    }
  );

  if (result.status !== 0) {
    console.error('[Sivflow] PostgreSQL migrationに失敗しました。psqlコマンドとDATABASE_URLを確認してください。');
    process.exit(result.status ?? 1);
  }
}

console.log('[Sivflow] PostgreSQL migrationが完了しました。');
