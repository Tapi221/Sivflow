import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const skip = new Set(['.git', '.yarn', 'node_modules', 'dist', 'build', 'coverage', '.next']);
const fields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

const fixValue = value => {
  if (typeof value !== 'string') return value;
  if (value === 'workspace:*') return '*';
  if (value === 'workspace:^') return '*';
  if (value === 'workspace:~') return '*';
  if (value.startsWith('workspace:')) return value.slice('workspace:'.length) || '*';
  if (value.includes('tinykeys@npm%3A2.1.0')) return '2.1.0';
  return value;
};

const fixPackage = async file => {
  const before = await fs.readFile(file, 'utf8');
  const json = JSON.parse(before);
  let changed = false;

  for (const field of fields) {
    const deps = json[field];
    if (!deps || typeof deps !== 'object') continue;

    for (const name of Object.keys(deps)) {
      const next = fixValue(deps[name]);
      if (next !== deps[name]) {
        deps[name] = next;
        changed = true;
      }
    }
  }

  if (!changed) return 0;

  await fs.writeFile(file, `${JSON.stringify(json, null, 2)}\n`);
  console.log(path.relative(root, file));
  return 1;
};

const walk = async dir => {
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skip.has(entry.name)) count += await walk(full);
      continue;
    }
    if (entry.isFile() && entry.name === 'package.json') {
      count += await fixPackage(full);
    }
  }

  return count;
};

const count = await walk(root);
console.log(`updated ${count} package.json file(s)`);
