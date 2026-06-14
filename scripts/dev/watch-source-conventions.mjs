import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { spawnSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const CLI_ARGS = new Set(process.argv.slice(2));
const DEFAULT_OLLAMA_URL = "http://localhost:11434/api/generate";
const DEFAULT_MODEL = "llama3.2:3b";
const WATCH_INTERVAL_MS = Number(process.env.SIVFLOW_LOCAL_LLM_WATCH_INTERVAL_MS ?? 5000);
const DEBOUNCE_MS = Number(process.env.SIVFLOW_LOCAL_LLM_DEBOUNCE_MS ?? 1200);
const MAX_FILES_PER_CYCLE = Number(process.env.SIVFLOW_LOCAL_LLM_MAX_FILES_PER_CYCLE ?? 3);
const MAX_LLM_ATTEMPTS_PER_FILE = Number(process.env.SIVFLOW_LOCAL_LLM_ATTEMPTS_PER_FILE ?? 1);
const SHOULD_FIX = CLI_ARGS.has("--fix") || process.env.SIVFLOW_LOCAL_LLM_FIX === "1";
const SHOULD_TYPECHECK = CLI_ARGS.has("--typecheck") || process.env.SIVFLOW_LOCAL_LLM_TYPECHECK === "1";
const SHOULD_RUN_ONCE = CLI_ARGS.has("--once");
const VERIFY_COMMAND = ["npm", "run", "verify:source-conventions"];
const FIX_IMPORTS_COMMAND = ["npm", "run", "lint:imports"];
const TYPECHECK_COMMAND = ["npm", "run", "typecheck"];
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const VIOLATION_PATTERN = /^- (?<path>[^:]+):(?<line>\d+) (?<message>.+)$/;
const FIXED_FILE_START = "<<<SIVFLOW_FIXED_FILE_START>>>";
const FIXED_FILE_END = "<<<SIVFLOW_FIXED_FILE_END>>>";

const toPosix = (value) => value.replaceAll("\\", "/");

const runCommand = ([command, ...args]) => spawnSync(command, args, { cwd: ROOT_DIR, encoding: "utf8", shell: process.platform === "win32" });

const getCommandOutput = (result) => `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();

const isSourceFile = (filePath) => SOURCE_EXTENSIONS.has(filePath.slice(filePath.lastIndexOf(".")));

const safeStatMtime = (filePath) => {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
};

const walkSourceFiles = (directory) => {
  if (!existsSync(directory)) return [];

  const result = spawnSync("node", ["-e", `const fs=require('node:fs');const path=require('node:path');const root=${JSON.stringify(directory)};const out=[];const walk=(dir)=>{for(const entry of fs.readdirSync(dir)){const p=path.join(dir,entry);const stat=fs.statSync(p);if(stat.isDirectory()) walk(p); else if(stat.isFile()) out.push(p)}};walk(root);console.log(JSON.stringify(out));`], { encoding: "utf8", shell: process.platform === "win32" });
  if (result.status !== 0) return [];

  try {
    return JSON.parse(result.stdout).filter(isSourceFile);
  } catch {
    return [];
  }
};

const getSourceSnapshot = () => {
  const entries = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).map((filePath) => [filePath, safeStatMtime(filePath)]);

  return new Map(entries);
};

const hasSourceSnapshotChanged = (previousSnapshot, nextSnapshot) => {
  if (previousSnapshot.size !== nextSnapshot.size) return true;

  for (const [filePath, mtime] of nextSnapshot) {
    if (previousSnapshot.get(filePath) !== mtime) return true;
  }

  return false;
};

const parseViolations = (output) => output.split("\n").flatMap((line) => {
  const match = line.match(VIOLATION_PATTERN);
  if (!match?.groups) return [];

  return [{ filePath: resolve(ROOT_DIR, match.groups.path), line: Number(match.groups.line), message: match.groups.message }];
});

const groupViolationsByFile = (violations) => {
  const grouped = new Map();

  for (const violation of violations) {
    const current = grouped.get(violation.filePath) ?? [];
    current.push(violation);
    grouped.set(violation.filePath, current);
  }

  return grouped;
};

const createPrompt = (filePath, source, violations) => `You are fixing one Sivflow source file. Return only the full fixed file between ${FIXED_FILE_START} and ${FIXED_FILE_END}.

Rules:
- Keep every import/export-from declaration on one line.
- Do not write type inside named imports. Use import type for type-only imports, and split value imports from type imports when they come from the same module.
- Use ./ relative imports only for the same directory.
- Use the existing repository aliases for imports that cross directories.
- Do not add compatibility paths, barrel exports, fallback imports, or @constants imports.
- Do not create constants folders.
- Keep file-local constants in the same file.
- Only shared values used by multiple files may live in a responsibility-owned .constants.ts next to that module.
- File order must be imports, type definitions, constants, helper functions, component body, memo / displayName / export.
- Put exactly one blank line between those blocks.
- Put dependencies before dependents.
- Use <>...</> for wrapper-only multiple JSX children.
- Do not use React.Fragment or Fragment explicitly except with key inside map.
- Do not wrap a single child in <>...</>; return the child directly.
- Do not use a div only as a wrapper unless className, style, ref, onClick, role, aria-*, data-*, or layout is needed.
- Preserve behavior.

File: ${toPosix(relative(ROOT_DIR, filePath))}
Violations:
${violations.map((violation) => `- line ${violation.line}: ${violation.message}`).join("\n")}

Current file:
${FIXED_FILE_START}
${source}
${FIXED_FILE_END}`;

const readOllamaResponse = async (prompt) => {
  const response = await fetch(process.env.SIVFLOW_LOCAL_LLM_URL ?? DEFAULT_OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.SIVFLOW_LOCAL_LLM_MODEL ?? DEFAULT_MODEL, prompt, stream: false }),
  });

  if (!response.ok) throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);

  const payload = await response.json();
  return typeof payload.response === "string" ? payload.response : "";
};

const extractFixedFile = (responseText) => {
  const startIndex = responseText.indexOf(FIXED_FILE_START);
  const endIndex = responseText.lastIndexOf(FIXED_FILE_END);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return null;

  return responseText.slice(startIndex + FIXED_FILE_START.length, endIndex).replace(/^\r?\n/, "").replace(/\r?\n$/, "");
};

const fixFileWithLocalLlm = async (filePath, violations) => {
  const before = readFileSync(filePath, "utf8");
  let source = before;

  for (let attempt = 0; attempt < MAX_LLM_ATTEMPTS_PER_FILE; attempt += 1) {
    const prompt = createPrompt(filePath, source, violations);
    const responseText = await readOllamaResponse(prompt);
    const fixedSource = extractFixedFile(responseText);
    if (!fixedSource || fixedSource === source) return false;

    source = fixedSource;
  }

  if (source === before) return false;

  writeFileSync(filePath, source);
  return true;
};

const runVerify = () => {
  const result = runCommand(VERIFY_COMMAND);
  const output = getCommandOutput(result);

  return { ok: result.status === 0, output, violations: parseViolations(output) };
};

const runFixImports = () => {
  const result = runCommand(FIX_IMPORTS_COMMAND);
  if (result.status !== 0) console.error(getCommandOutput(result));
};

const runTypecheck = () => {
  const result = runCommand(TYPECHECK_COMMAND);
  if (result.status !== 0) console.error(getCommandOutput(result));

  return result.status === 0;
};

const runFixCycle = async () => {
  runFixImports();

  const firstVerify = runVerify();
  if (firstVerify.ok) {
    console.log("Source conventions are clean.");
    return;
  }

  if (!SHOULD_FIX) {
    console.error(firstVerify.output);
    console.error("Run npm run watch:source-conventions:fix to allow local LLM file rewrites.");
    return;
  }

  const groupedViolations = [...groupViolationsByFile(firstVerify.violations).entries()].slice(0, MAX_FILES_PER_CYCLE);

  for (const [filePath, violations] of groupedViolations) {
    console.log(`Fixing ${toPosix(relative(ROOT_DIR, filePath))} with local LLM...`);
    await fixFileWithLocalLlm(filePath, violations);
  }

  runFixImports();

  const secondVerify = runVerify();
  if (!secondVerify.ok) {
    console.error(secondVerify.output);
    return;
  }

  if (SHOULD_TYPECHECK) runTypecheck();
  console.log("Source conventions are clean after local LLM fixes.");
};

const main = async () => {
  console.log(SHOULD_FIX ? "Watching Sivflow source conventions with local LLM rewrites enabled." : "Watching Sivflow source conventions in verify-only mode.");

  let snapshot = getSourceSnapshot();
  await runFixCycle();

  if (SHOULD_RUN_ONCE) return;

  while (true) {
    await sleep(WATCH_INTERVAL_MS);

    const nextSnapshot = getSourceSnapshot();
    if (!hasSourceSnapshotChanged(snapshot, nextSnapshot)) continue;

    snapshot = nextSnapshot;
    await sleep(DEBOUNCE_MS);
    await runFixCycle();
    snapshot = getSourceSnapshot();
  }
};

await main();
