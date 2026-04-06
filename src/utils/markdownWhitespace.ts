const MARKDOWN_TAB_SIZE_OPTIONS = [2, 4, 8] as const;

export type MarkdownTabSize = (typeof MARKDOWN_TAB_SIZE_OPTIONS)[number];

type MarkdownWhitespaceLineKind = "eligible" | "excluded";

type MarkdownScannerState = {
  inFence: boolean;
  fenceChar: "`" | "~" | "";
  fenceLength: number;
  activeListIndent: number | null;
};

const NBSP_REGEX = /\u00A0/g;

const createScannerState = (): MarkdownScannerState => {
  return {
    inFence: false,
    fenceChar: "",
    fenceLength: 0,
    activeListIndent: null,
  };
};

export const clampMarkdownTabSize = (input: unknown): MarkdownTabSize => {
  if (typeof input !== "number" || !Number.isFinite(input)) return 2;
  if (input <= 2) return 2;
  if (input <= 4) return 4;
  return 8;
};

export const normalizeMarkdownLineEndings = (input: string): string => {
  return String(input ?? "").replace(/\r\n?/g, "\n");
};

export const normalizeMarkdownNbsp = (input: string): string => {
  return normalizeMarkdownLineEndings(input).replace(NBSP_REGEX, " ");
};

export const stripTrailingMarkdownNewlines = (input: string): string => {
  return normalizeMarkdownLineEndings(input).replace(/\n+$/g, "");
};

const countLeadingSpaces = (line: string): number => {
  const match = line.match(/^[ ]*/);
  return match?.[0].length ?? 0;
};

const stripBlockquotePrefix = (
  line: string,
): { prefix: string; content: string; isBlockquote: boolean } => {
  let cursor = 0;
  let prefix = "";
  let isBlockquote = false;

  while (cursor < line.length) {
    const remaining = line.slice(cursor);
    const ws = remaining.match(/^[ \t]*/)?.[0] ?? "";
    const next = cursor + ws.length;
    if (line[next] !== ">") break;

    isBlockquote = true;
    prefix += ws + ">";
    cursor = next + 1;

    if (line[cursor] === " ") {
      prefix += " ";
      cursor += 1;
    }
  }

  return {
    prefix,
    content: line.slice(cursor),
    isBlockquote,
  };
};

const parseFenceMarker = (
  content: string,
): { char: "`" | "~"; length: number } | null => {
  const match = content.match(/^\s*(`{3,}|~{3,})/);
  if (!match?.[1]) return null;

  const marker = match[1];
  const char = marker[0] as "`" | "~";
  return {
    char,
    length: marker.length,
  };
};

const isFenceClose = (
  content: string,
  state: MarkdownScannerState,
): boolean => {
  if (!state.inFence || !state.fenceChar || state.fenceLength === 0) {
    return false;
  }

  const pattern = new RegExp(
    `^\\s*${state.fenceChar}{${state.fenceLength},}\\s*$`,
  );
  return pattern.test(content);
};

const isBlankLine = (content: string): boolean => {
  return content.trim().length === 0;
};

const isHorizontalRule = (content: string): boolean => {
  return /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(content);
};

const looksLikeAtxHeading = (content: string): boolean => {
  return /^\s{0,3}#{1,6}(?:\s|$)/.test(content);
};

const looksLikeListItem = (content: string): boolean => {
  return /^\s{0,3}(?:[*+-]|\d+[.)])(?:\s+|\t+)/.test(content);
};

const looksLikeTableDelimiter = (content: string): boolean => {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(content);
};

const looksLikeTableRow = (content: string): boolean => {
  return /^\s*\|.*\|\s*$/.test(content);
};

const looksLikeMarkdownTableLine = (content: string): boolean => {
  return looksLikeTableDelimiter(content) || looksLikeTableRow(content);
};

const isIndentedCodeLine = (content: string): boolean => {
  return /^(?: {4,}|\t)/.test(content);
};

const isListContinuationLine = (
  content: string,
  state: MarkdownScannerState,
): boolean => {
  if (state.activeListIndent === null) return false;
  if (isBlankLine(content)) return true;

  const spacesOnly = content.replace(/\t/g, "    ");
  const leading = countLeadingSpaces(spacesOnly);
  return leading > state.activeListIndent;
};

const classifyMarkdownLine = (
  line: string,
  state: MarkdownScannerState,
): MarkdownWhitespaceLineKind => {
  const { content } = stripBlockquotePrefix(line);

  if (state.inFence) {
    const closesFence = isFenceClose(content, state);
    if (closesFence) {
      state.inFence = false;
      state.fenceChar = "";
      state.fenceLength = 0;
    }
    state.activeListIndent = null;
    return "excluded";
  }

  const fenceMarker = parseFenceMarker(content);
  if (fenceMarker) {
    state.inFence = true;
    state.fenceChar = fenceMarker.char;
    state.fenceLength = fenceMarker.length;
    state.activeListIndent = null;
    return "excluded";
  }

  const listContinuation = isListContinuationLine(content, state);

  if (looksLikeListItem(content)) {
    state.activeListIndent = countLeadingSpaces(content.replace(/\t/g, "    "));
    return "excluded";
  }

  if (listContinuation) {
    return "excluded";
  }

  if (
    looksLikeAtxHeading(content) ||
    looksLikeMarkdownTableLine(content) ||
    isHorizontalRule(content) ||
    isIndentedCodeLine(content)
  ) {
    state.activeListIndent = null;
    return "excluded";
  }

  if (!isBlankLine(content)) {
    state.activeListIndent = null;
  }

  return "eligible";
};

const getLineIndexAtOffset = (input: string, offset: number): number => {
  const normalized = normalizeMarkdownLineEndings(input);
  const boundedOffset = Math.max(0, Math.min(offset, normalized.length));
  const lines = normalized.split("\n");

  let cursor = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const lineLength = lines[index]?.length ?? 0;
    const lineEnd = cursor + lineLength;
    if (boundedOffset <= lineEnd) return index;
    cursor = lineEnd + 1;
  }

  return Math.max(0, lines.length - 1);
};

const scanToLineKind = (
  input: string,
  targetLineIndex: number,
): MarkdownWhitespaceLineKind => {
  const normalized = normalizeMarkdownLineEndings(input);
  const lines = normalized.split("\n");
  const state = createScannerState();

  let kind: MarkdownWhitespaceLineKind = "eligible";

  for (let index = 0; index <= targetLineIndex; index += 1) {
    const line = lines[index] ?? "";
    kind = classifyMarkdownLine(line, state);
  }

  return kind;
};

export const isEligibleMarkdownWhitespaceOffset = (
  input: string,
  offset: number,
): boolean => {
  const lineIndex = getLineIndexAtOffset(input, offset);
  return scanToLineKind(input, lineIndex) === "eligible";
};

export const resolveMarkdownTabKeyText = (
  input: string,
  offset: number,
  tabSize: unknown,
): string => {
  return isEligibleMarkdownWhitespaceOffset(input, offset)
    ? " ".repeat(clampMarkdownTabSize(tabSize))
    : "\t";
};

export const expandTabsInEligibleMarkdownLines = (
  input: string,
  tabSize: unknown,
): string => {
  const normalized = normalizeMarkdownNbsp(input);
  if (!normalized.includes("\t")) return normalized;

  const effectiveTabSize = clampMarkdownTabSize(tabSize);
  const replacement = " ".repeat(effectiveTabSize);
  const lines = normalized.split("\n");
  const state = createScannerState();

  return lines
    .map((line) => {
      const kind = classifyMarkdownLine(line, state);
      if (kind === "excluded") return line;
      return line.replace(/\t/g, replacement);
    })
    .join("\n");
};

export const normalizeMarkdownInsertionText = (
  input: string,
  tabSize: unknown,
): string => {
  return expandTabsInEligibleMarkdownLines(input, tabSize);
};

export const normalizeMarkdownEditorValue = (
  input: string,
  tabSize: unknown,
): string => {
  const normalized = expandTabsInEligibleMarkdownLines(input, tabSize);
  return stripTrailingMarkdownNewlines(normalized);
};
