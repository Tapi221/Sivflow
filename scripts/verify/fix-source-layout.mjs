import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const CONFLICT_MARKER_PATTERN = /^(?:<{7}|={7}|>{7})(?:\s|$)/u;
const INLINE_MEMBER_CONTAINER_PATTERNS = [
  /^(\s*(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:class|interface)\b[^{}]*\{\s*)(\S.*)$/u,
  /^(\s*(?:export\s+)?type\b[^=]*=\s*\{\s*)(\S.*)$/u,
];
const INLINE_COMMENT_CODE_PATTERN = /^(.*?)(\s+(?:return|const|let|var|if|for|while|switch|throw|await|try)\b[\s\S]*)$/u;

const walkSourceFiles = (directory) => {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) return walkSourceFiles(entryPath);
    if (!stat.isFile()) return [];
    if (!SOURCE_EXTENSIONS.has(path.extname(entryPath))) return [];

    return [entryPath];
  });
};

const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";

const splitLines = (source) => source.split(/\r?\n/u);

const isConflictMarkerLine = (line) => CONFLICT_MARKER_PATTERN.test(line.trimStart());

const stripEmptyConflictMarkerBlocks = (source) => {
  const newline = getNewline(source);
  const lines = splitLines(source);
  const nextLines = [];
  let changed = false;

  for (let index = 0; index < lines.length;) {
    const line = lines[index];

    if (!isConflictMarkerLine(line)) {
      nextLines.push(line);
      index += 1;
      continue;
    }

    let endIndex = index;
    let hasMarker = false;
    let hasNonBlankContent = false;

    while (endIndex < lines.length && (lines[endIndex].trim() === "" || isConflictMarkerLine(lines[endIndex]))) {
      if (isConflictMarkerLine(lines[endIndex])) {
        hasMarker = true;
      } else if (lines[endIndex].trim() !== "") {
        hasNonBlankContent = true;
      }
      endIndex += 1;
    }

    if (hasMarker && !hasNonBlankContent) {
      changed = true;
      index = endIndex;
      continue;
    }

    nextLines.push(line);
    index += 1;
  }

  return changed ? nextLines.join(newline) : source;
};

const splitCommentAndCode = (value) => {
  const match = value.match(INLINE_COMMENT_CODE_PATTERN);
  if (!match) return { codeText: null, commentText: value.trim() };

  return {
    codeText: match[2].trim(),
    commentText: match[1].trimEnd(),
  };
};

const splitInlineOpeningBraceCommentLines = (source) => {
  const newline = getNewline(source);
  const nextLines = [];
  let changed = false;

  for (const line of splitLines(source)) {
    const match = line.match(/^(?<prefix>.*\{\s*)\/\/\s*(?<comment>.*)$/u);
    if (!match?.groups) {
      nextLines.push(line);
      continue;
    }

    const indentation = line.match(/^\s*/u)?.[0] ?? "";
    const childIndentation = `${indentation}  `;
    const { codeText, commentText } = splitCommentAndCode(match.groups.comment);

    nextLines.push(match.groups.prefix.trimEnd());
    if (commentText.length > 0) nextLines.push(`${childIndentation}// ${commentText}`);
    if (codeText) nextLines.push(`${childIndentation}${codeText}`);
    changed = true;
  }

  return changed ? nextLines.join(newline) : source;
};

const matchInlineMemberContainer = (line) => {
  for (const pattern of INLINE_MEMBER_CONTAINER_PATTERNS) {
    const match = line.match(pattern);
    if (match) return match;
  }

  return null;
};

const splitInlineMemberContainerLines = (source) => {
  const newline = getNewline(source);
  const nextLines = [];
  let changed = false;

  for (const line of splitLines(source)) {
    const match = matchInlineMemberContainer(line);
    if (!match || match[2].trim() === "}") {
      nextLines.push(line);
      continue;
    }

    const indentation = line.match(/^\s*/u)?.[0] ?? "";
    nextLines.push(match[1].trimEnd());
    nextLines.push(`${indentation}  ${match[2]}`);
    changed = true;
  }

  return changed ? nextLines.join(newline) : source;
};

const applySourceLayoutFix = (source) => {
  let nextSource = source;
  const maxPassCount = 20;

  for (let pass = 0; pass < maxPassCount; pass += 1) {
    const fixedSource = splitInlineMemberContainerLines(splitInlineOpeningBraceCommentLines(stripEmptyConflictMarkerBlocks(nextSource)));
    if (fixedSource === nextSource) return nextSource;
    nextSource = fixedSource;
  }

  return nextSource;
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applySourceLayoutFix(originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`source layout を ${updatedFiles.length} file(s) 修正しました。`);
}
