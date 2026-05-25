import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const rootDir = process.cwd();
const targetExtensions = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const ignoredDirectories = new Set([".git", ".next", "coverage", "dist", "dist-electron", "node_modules"]);
const selfPath = join(rootDir, "scripts/format-imports.mjs");
const workflowPath = join(rootDir, ".github/workflows/format-imports-on-push.yml");

const isImportLine = (line) => {
  const trimmed = line.trimStart();
  return /^import(?:\s|["'({*])/.test(trimmed) && !/^import\s*\(/.test(trimmed);
};

const normalizeNamedImportSpacing = (statement) => {
  return statement.replace(/\{([^{}]*)\}/g, (_, inner) => {
    const normalizedInner = inner
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ");

    return `{ ${normalizedInner} }`;
  });
};

const normalizeImportStatement = (statement) => {
  let normalized = statement.replace(/\s+/g, " ").trim();

  normalized = normalizeNamedImportSpacing(normalized);
  normalized = normalized.replace(/\s+,/g, ",");
  normalized = normalized.replace(/,\s*/g, ", ");
  normalized = normalized.replace(/,\s*}/g, " }");
  normalized = normalized.replace(/\{\s+}/g, "{}");
  normalized = normalized.replace(/\s+from\s+/g, " from ");
  normalized = normalized.replace(/\s+assert\s+/g, " assert ");
  normalized = normalized.replace(/\s+with\s+/g, " with ");
  normalized = normalized.replace(/\s+;$/, ";");

  return normalized;
};

const formatImports = (source) => {
  const hasTrailingNewline = /\r?\n$/.test(source);
  const lines = source.split(/\r?\n/);
  if (hasTrailingNewline) lines.pop();

  const flattenedLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!isImportLine(line)) {
      flattenedLines.push(line);
      continue;
    }

    let statement = line;
    while (!statement.includes(";") && index + 1 < lines.length) {
      index += 1;
      statement += `\n${lines[index]}`;
    }

    flattenedLines.push(normalizeImportStatement(statement));
  }

  const compactedLines = [];

  for (let index = 0; index < flattenedLines.length; index += 1) {
    compactedLines.push(flattenedLines[index]);

    if (!isImportLine(flattenedLines[index])) continue;

    let nextNonEmptyIndex = index + 1;
    while (nextNonEmptyIndex < flattenedLines.length && flattenedLines[nextNonEmptyIndex].trim() === "") {
      nextNonEmptyIndex += 1;
    }

    if (nextNonEmptyIndex < flattenedLines.length && isImportLine(flattenedLines[nextNonEmptyIndex])) {
      index = nextNonEmptyIndex - 1;
    }
  }

  return `${compactedLines.join("\n")}${hasTrailingNewline ? "\n" : ""}`;
};

const walk = (directory, files = []) => {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;

    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (stats.isFile() && targetExtensions.has(extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
};

for (const filePath of walk(rootDir)) {
  const source = readFileSync(filePath, "utf8");
  const formatted = formatImports(source);

  if (formatted !== source) {
    writeFileSync(filePath, formatted);
  }
}

for (const temporaryPath of [selfPath, workflowPath]) {
  if (existsSync(temporaryPath)) {
    rmSync(temporaryPath);
  }
}
