#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const defaultIgnoredDirectories = new Set([
  '.cache',
  '.git',
  '.turbo',
  '.vite',
  'coverage',
  'dist',
  'dist-electron',
  'dist-ssr',
  'node_modules',
  'test-results',
]);

const envKeyPattern = /^(AFFINE_|CI$|NODE_ENV$|SIVFLOW_|VITE_)/;

const normalizePath = value => value.split(path.sep).join('/');

const parseArgs = argv => {
  const separatorIndex = argv.indexOf('--');
  const optionArgs =
    separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
  const commandArgs =
    separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1);
  const options = {
    inputs: [],
    outputs: [],
  };

  for (let index = 0; index < optionArgs.length; index++) {
    const arg = optionArgs[index];

    if (!arg.startsWith('--')) {
      throw new Error(`不明な引数です: ${arg}`);
    }

    const key = arg.slice(2);
    const value = optionArgs[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`--${key} に値が必要です`);
    }

    index++;

    if (key === 'input') {
      options.inputs.push(value);
      continue;
    }

    if (key === 'output') {
      options.outputs.push(value);
      continue;
    }

    options[key] = value;
  }

  return { options, commandArgs };
};

const resolveFromRoot = (rootDir, value) => {
  return path.resolve(rootDir, value);
};

const isInside = (candidate, parent) => {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const shouldIgnore = (target, outputPaths) => {
  const segments = normalizePath(target).split('/');

  if (segments.some(segment => defaultIgnoredDirectories.has(segment))) {
    return true;
  }

  return outputPaths.some(output => isInside(target, output));
};

const collectFiles = async (target, outputPaths) => {
  const stat = await fs.lstat(target).catch(() => null);

  if (!stat) {
    return [{ path: target, missing: true }];
  }

  if (stat.isDirectory()) {
    if (shouldIgnore(target, outputPaths)) {
      return [];
    }

    const entries = await fs.readdir(target, { withFileTypes: true });
    const children = await Promise.all(
      entries
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(entry => collectFiles(path.join(target, entry.name), outputPaths))
    );

    return children.flat();
  }

  if (!stat.isFile()) {
    return [];
  }

  return [{ path: target, stat }];
};

const hashBuildState = async ({ rootDir, commandArgs, inputs, outputs }) => {
  const hash = createHash('sha256');
  const outputPaths = outputs.map(output => resolveFromRoot(rootDir, output));

  hash.update(`build-cache-v1\0`);
  hash.update(`node\0${process.version}\0`);
  hash.update(`command\0${commandArgs.join('\0')}\0`);

  for (const key of Object.keys(process.env).filter(key => envKeyPattern.test(key)).sort()) {
    hash.update(`env\0${key}\0${process.env[key] ?? ''}\0`);
  }

  const files = (
    await Promise.all(
      inputs.map(input => collectFiles(resolveFromRoot(rootDir, input), outputPaths))
    )
  )
    .flat()
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const file of files) {
    const relativePath = normalizePath(path.relative(rootDir, file.path));

    if (file.missing) {
      hash.update(`missing\0${relativePath}\0`);
      continue;
    }

    hash.update(`file\0${relativePath}\0${file.stat.size}\0`);
    hash.update(await fs.readFile(file.path));
    hash.update('\0');
  }

  return hash.digest('hex');
};

const outputsExist = async (rootDir, outputs) => {
  if (outputs.length === 0) {
    return false;
  }

  const checks = await Promise.all(
    outputs.map(async output => {
      return fs.access(resolveFromRoot(rootDir, output)).then(
        () => true,
        () => false
      );
    })
  );

  return checks.every(Boolean);
};

const readManifest = async manifestPath => {
  try {
    return JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  } catch {
    return null;
  }
};

const runCommand = (commandArgs, cwd) => {
  return new Promise((resolve, reject) => {
    const child = spawn(commandArgs[0], commandArgs.slice(1), {
      cwd,
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ビルドコマンドが終了コード ${code} で失敗しました`));
    });
  });
};

const sanitizeName = name => {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
};

const main = async () => {
  const { options, commandArgs } = parseArgs(process.argv.slice(2));

  if (!options.name) {
    throw new Error('--name が必要です');
  }

  if (!options.root) {
    throw new Error('--root が必要です');
  }

  if (options.inputs.length === 0) {
    throw new Error('--input が1つ以上必要です');
  }

  if (commandArgs.length === 0) {
    throw new Error('実行するビルドコマンドを -- の後に指定してください');
  }

  const rootDir = path.resolve(process.cwd(), options.root);
  const cwd = options.cwd ? resolveFromRoot(rootDir, options.cwd) : process.cwd();
  const cacheDir = path.join(rootDir, '.cache', 'sivflow-build');
  const manifestPath = path.join(cacheDir, `${sanitizeName(options.name)}.json`);
  const hash = await hashBuildState({
    rootDir,
    commandArgs,
    inputs: options.inputs,
    outputs: options.outputs,
  });
  const manifest = await readManifest(manifestPath);

  if (
    process.env.SIVFLOW_BUILD_CACHE !== '0' &&
    manifest?.hash === hash &&
    (await outputsExist(rootDir, options.outputs))
  ) {
    console.log(`[build-cache] ${options.name}: 変更なし。ビルドをスキップします。`);
    return;
  }

  if (!existsSync(cwd)) {
    throw new Error(`作業ディレクトリが見つかりません: ${cwd}`);
  }

  console.log(`[build-cache] ${options.name}: キャッシュミス。ビルドします。`);
  await runCommand(commandArgs, cwd);
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        version: 1,
        name: options.name,
        hash,
        cwd: normalizePath(path.relative(rootDir, cwd)),
        command: commandArgs,
        inputs: options.inputs,
        outputs: options.outputs,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`
  );
};

main().catch(error => {
  console.error(`[build-cache] ${error.message}`);
  process.exitCode = 1;
});
