type MarkdownWhitespaceLineKind = "eligible" | "excluded";
type MarkdownScannerState = {
  inFence: boolean;
  fenceChar: "`" | "~" | "";
  fenceLength: number;
  activeListIndent: number | null;
};
type MarkdownLineAnalysis = {
  raw: string;
  prefix: string;
  content: string;
  kind: MarkdownWhitespaceLineKind;
};
type InlineCodeRange = {
  start: number;
  end: number;
};
type MarkdownTabSize = 2 | 4 | 8;



const MARKDOWN_TAB_SIZE_VALUES = [2, 4, 8] as const;
const NBSP_REGEX = /\u00A0/g;
const HTML_BLOCK_TAGS = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul",
  "pre",
  "script",
  "style",
].join("|");
const HTML_BLOCK_START_RE = new RegExp(
  `^\\s{0,3}(?:</?(?:${HTML_BLOCK_TAGS})(?:\\s|/?>)|<!--|<![A-Z]|<\\?)`,
  "i",
);



const createScannerState = (): MarkdownScannerState => {
  return {
    inFence: false,
    fenceChar: "",
    fenceLength: 0,
    activeListIndent: null,
  };
};
const clampMarkdownTabSize = (input: unknown): MarkdownTabSize => {
  if (typeof input !== "number" || !Number.isFinite(input)) return MARKDOWN_TAB_SIZE_VALUES[0];
  if (input <= 2) return MARKDOWN_TAB_SIZE_VALUES[0];
  if (input <= 4) return MARKDOWN_TAB_SIZE_VALUES[1];
  return MARKDOWN_TAB_SIZE_VALUES[2];
};
const normalizeMarkdownLineEndings = (input: string): string => {
  return String(input ?? "").replace(/\r\n?/g, "\n");
};
const normalizeMarkdownNbsp = (input: string): string => {
  return normalizeMarkdownLineEndings(input).replace(NBSP_REGEX, " ");
};
const stripTrailingMarkdownNewlines = (input: string): string => {
  return normalizeMarkdownLineEndings(input).replace(/\n+$/g, "");
};
const countLeadingSpaces = (line: string): number => {
  const match = line.match(/^[ ]*/);
  return match?.[0].length ?? 0;
};
const stripBlockquotePrefix = (
  line: string,
): { prefix: string; content: string; isBlockquote: boolean; } => {
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
): { char: "`" | "~"; length: number; } | null => {
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
const looksLikeSetextUnderline = (content: string): boolean => {
  return /^\s{0,3}(?:=+|-+)\s*$/.test(content);
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
const looksLikeHtmlBlockLine = (content: string): boolean => {
  return HTML_BLOCK_START_RE.test(content);
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
const classifyMarkdownLineBase = (
  line: string,
  state: MarkdownScannerState,
): MarkdownLineAnalysis => {
  const { prefix, content } = stripBlockquotePrefix(line);

  if (state.inFence) {
    const closesFence = isFenceClose(content, state);
    if (closesFence) {
      state.inFence = false;
      state.fenceChar = "";
      state.fenceLength = 0;
    }

    state.activeListIndent = null;
    return {
      raw: line,
      prefix,
      content,
      kind: "excluded",
    };
  }

  const fenceMarker = parseFenceMarker(content);
  if (fenceMarker) {
    state.inFence = true;
    state.fenceChar = fenceMarker.char;
    state.fenceLength = fenceMarker.length;
    state.activeListIndent = null;

    return {
      raw: line,
      prefix,
      content,
      kind: "excluded",
    };
  }

  const listContinuation = isListContinuationLine(content, state);

  if (looksLikeListItem(content)) {
    state.activeListIndent = countLeadingSpaces(content.replace(/\t/g, "    "));

    return {
      raw: line,
      prefix,
      content,
      kind: "excluded",
    };
  }

  if (listContinuation) {
    return {
      raw: line,
      prefix,
      content,
      kind: "excluded",
    };
  }

  if (
    looksLikeAtxHeading(content) ||
    looksLikeMarkdownTableLine(content) ||
    isHorizontalRule(content) ||
    isIndentedCodeLine(content) ||
    looksLikeHtmlBlockLine(content)
  ) {
    state.activeListIndent = null;

    return {
      raw: line,
      prefix,
      content,
      kind: "excluded",
    };
  }

  if (!isBlankLine(content)) {
    state.activeListIndent = null;
  }

  return {
    raw: line,
    prefix,
    content,
    kind: "eligible",
  };
};
const computeMarkdownLineAnalyses = (input: string): MarkdownLineAnalysis[] => {
  const normalized = normalizeMarkdownLineEndings(input);
  const lines = normalized.split("\n");
  const state = createScannerState();

  const analyses = lines.map((line) => classifyMarkdownLineBase(line, state));

  for (let index = 1; index < analyses.length; index += 1) {
    const current = analyses[index];
    const previous = analyses[index - 1];

    if (!current || !previous) continue;
    if (!looksLikeSetextUnderline(current.content)) continue;
    if (previous.content.trim().length === 0) continue;
    if (previous.kind !== "eligible") continue;

    analyses[index] = {
      ...current,
      kind: "excluded",
    };

    analyses[index - 1] = {
      ...previous,
      kind: "excluded",
    };
  }

  return analyses;
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
const getLineStartOffset = (lines: string[], lineIndex: number): number => {
  let cursor = 0;

  for (let index = 0; index < lineIndex; index += 1) {
    cursor += (lines[index]?.length ?? 0) + 1;
  }

  return cursor;
};
const getInlineCodeRanges = (content: string): InlineCodeRange[] => {
  if (!content.includes("`")) return [];

  const ranges: InlineCodeRange[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    if (content[cursor] !== "`") {
      cursor += 1;
      continue;
    }

    let openEnd = cursor;
    while (content[openEnd] === "`") {
      openEnd += 1;
    }

    const runLength = openEnd - cursor;
    let search = openEnd;
    let matched = false;

    while (search < content.length) {
      if (content[search] !== "`") {
        search += 1;
        continue;
      }

      let closeEnd = search;
      while (content[closeEnd] === "`") {
        closeEnd += 1;
      }

      const closeLength = closeEnd - search;
      if (closeLength === runLength) {
        ranges.push({
          start: cursor,
          end: closeEnd,
        });
        cursor = closeEnd;
        matched = true;
        break;
      }

      search = closeEnd;
    }

    if (!matched) {
      cursor = openEnd;
    }
  }

  return ranges;
};
const isContentOffsetInsideInlineCode = (
  content: string,
  contentOffset: number,
): boolean => {
  if (contentOffset < 0) return false;

  const ranges = getInlineCodeRanges(content);
  return ranges.some((range) => {
    return contentOffset >= range.start && contentOffset < range.end;
  });
};
const replaceTabsOutsideInlineCode = (
  content: string,
  replacement: string,
): string => {
  if (!content.includes("\t")) return content;

  const ranges = getInlineCodeRanges(content);
  if (ranges.length === 0) {
    return content.replace(/\t/g, replacement);
  }

  let result = "";
  let cursor = 0;

  for (const range of ranges) {
    result += content.slice(cursor, range.start).replace(/\t/g, replacement);
    result += content.slice(range.start, range.end);
    cursor = range.end;
  }

  result += content.slice(cursor).replace(/\t/g, replacement);
  return result;
};
const isEligibleMarkdownWhitespaceOffset = (input: string, offset: number): boolean => {
  const analyses = computeMarkdownLineAnalyses(input);
  const lineIndex = getLineIndexAtOffset(input, offset);
  return analyses[lineIndex]?.kind === "eligible";
};
const resolveMarkdownTabKeyText = (input: string, offset: number, tabSize: unknown): string => {
  const normalized = normalizeMarkdownLineEndings(input);
  const analyses = computeMarkdownLineAnalyses(normalized);
  const lineIndex = getLineIndexAtOffset(normalized, offset);
  const analysis = analyses[lineIndex];

  if (!analysis || analysis.kind !== "eligible") {
    return "\t";
  }

  const lines = normalized.split("\n");
  const lineStart = getLineStartOffset(lines, lineIndex);
  const boundedOffset = Math.max(0, Math.min(offset, normalized.length));
  const contentOffset = boundedOffset - lineStart - analysis.prefix.length;

  if (contentOffset < 0) return "\t";
  if (isContentOffsetInsideInlineCode(analysis.content, contentOffset)) {
    return "\t";
  }

  return " ".repeat(clampMarkdownTabSize(tabSize));
};
const expandTabsInEligibleMarkdownLines = (input: string, tabSize: unknown): string => {
  const normalized = normalizeMarkdownNbsp(input);
  if (!normalized.includes("\t")) return normalized;

  const effectiveTabSize = clampMarkdownTabSize(tabSize);
  const replacement = " ".repeat(effectiveTabSize);
  const analyses = computeMarkdownLineAnalyses(normalized);

  return analyses
    .map((analysis) => {
      if (analysis.kind === "excluded") return analysis.raw;
      return `${analysis.prefix}${replaceTabsOutsideInlineCode(analysis.content, replacement)}`;
    })
    .join("\n");
};
const normalizeMarkdownInsertionText = (input: string, tabSize: unknown): string => {
  return expandTabsInEligibleMarkdownLines(input, tabSize);
};
const normalizeMarkdownEditorValue = (input: string, tabSize: unknown): string => {
  const normalized = expandTabsInEligibleMarkdownLines(input, tabSize);
  return stripTrailingMarkdownNewlines(normalized);
};



export { clampMarkdownTabSize, normalizeMarkdownLineEndings, normalizeMarkdownNbsp, stripTrailingMarkdownNewlines, isEligibleMarkdownWhitespaceOffset, resolveMarkdownTabKeyText, expandTabsInEligibleMarkdownLines, normalizeMarkdownInsertionText, normalizeMarkdownEditorValue };


export type { MarkdownTabSize };
