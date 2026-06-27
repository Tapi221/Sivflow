import React from "react";
import { MarkdownEditorDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.MarkdownEditor";
import { MarkdownBlockDisplay } from "./MarkdownBlockDisplay";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import { clampMarkdownTabSize, normalizeMarkdownEditorValue, normalizeMarkdownInsertionText, resolveMarkdownTabKeyText } from "@/utils/markdownWhitespace";



type MarkdownReplaceBlock =
  | { type: "markdown"; markdown: string; }
  | { type: "code"; code: { language: string; code: string; }; };
type MarkdownReplaceFocus = Readonly<{
  relativeIndex: number;
}>;
type MarkdownBlockContentProps =
  | Readonly<{
    mode: "view";
    markdown: string;
    zoom?: number;
  }>
  | Readonly<{
    mode: "edit";
    markdown: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChange: (next: string) => void;
    onReplaceWithBlocks?: (
      blocks: MarkdownReplaceBlock[],
      focus?: MarkdownReplaceFocus,
    ) => void;
    accentColor?: string;
    zoom?: number;
  }>;
type BlockRange = Readonly<{
  start: number;
  end: number;
  type: MarkdownReplaceBlock["type"];
}>;



const MAX_LENGTH = 50000;



const validateBlocksLength = (blocks: MarkdownReplaceBlock[]) => {
  for (const block of blocks) {
    const length =
      block.type === "markdown"
        ? block.markdown.length
        : block.code.code.length;
    if (length > MAX_LENGTH) return false;
  }
  return true;
};
const htmlToPlainText = (html: string) => {
  if (typeof document === "undefined") return "";
  try {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent ?? div.innerText ?? "";
  } catch {
    return "";
  }
};
const restoreCaret = (textarea: HTMLTextAreaElement, pos: number) => {
  requestAnimationFrame(() => {
    try {
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    } catch (error) {
      void error;
    }
  });
};
const looksLikeHtmlBlockCandidate = (value: string) => {
  return /^\s*<\w+[\s>]/.test(String(value ?? ""));
};
const detectLang = (plain: string, html: string) => {
  const match = html?.match(/language-([a-z0-9_+-]+)/i);
  if (match?.[1]) return match[1];
  if (/\bclassName=/.test(plain) || /^\s*</m.test(plain)) return "tsx";
  if (/\binterface\b|\btype\b|\bimplements\b/.test(plain)) return "ts";
  return "text";
};
const isFenceStart = (text: string) => {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let index = 0;
  while (index < lines.length && (lines[index]?.trim().length ?? 0) === 0) {
    index += 1;
  }
  if (index >= lines.length) return false;
  return /^( {0,3})(`{3,}|~{3,})/.test(lines[index] ?? "");
};
const computeFocusOffsetInInsertText = (insertText: string) => {
  const normalized = String(insertText ?? "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let offset = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const isLast = index === lines.length - 1;
    if (line.trim().length === 0) {
      offset += line.length + (isLast ? 0 : 1);
      continue;
    }
    const match = line.match(/^( {0,3})(`{3,}|~{3,})/);
    if (match) {
      return offset + (match[1]?.length ?? 0);
    }
    return offset;
  }
  return 0;
};
const normalizeFenceBoundaries = (
  insertText: string,
  ctx: { atLineStart: boolean; atLineEnd: boolean; },
): { text: string; focusOffset: number; } => {
  if (!isFenceStart(insertText)) {
    return { text: insertText, focusOffset: 0 };
  }
  let nextText = insertText;
  if (!ctx.atLineStart && !/^\r?\n/.test(nextText)) {
    nextText = `\n${nextText}`;
  }
  if (!ctx.atLineEnd && !/\r?\n$/.test(nextText)) {
    nextText = `${nextText}\n`;
  }
  return {
    text: nextText,
    focusOffset: computeFocusOffsetInInsertText(nextText),
  };
};
const wrapFence = (code: string, lang: string) => {
  const normalized = String(code ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+$/g, "");
  return `\`\`\`${lang}\n${normalized}\n\`\`\`\n`;
};
const extractPreTextFromHtml = (html: string) => {
  if (typeof document === "undefined") return "";
  try {
    const div = document.createElement("div");
    div.innerHTML = html;
    const pre = div.querySelector("pre");
    const code = pre?.querySelector("code");
    if (code?.textContent) return code.textContent;
    if (pre?.textContent) return pre.textContent;
    return div.textContent ?? div.innerText ?? "";
  } catch {
    return "";
  }
};
const pickBlockIndexByPos = (ranges: BlockRange[], pos: number) => {
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    if (!range) continue;
    if (pos >= range.start && pos < range.end) return index;
  }
  return Math.max(0, ranges.length - 1);
};
const parseAndSplitFencesWithRanges = (
  markdown: string,
): { blocks: MarkdownReplaceBlock[]; ranges: BlockRange[]; } => {
  const normalizedMarkdown = markdown.replace(/\r\n/g, "\n");
  const lines = normalizedMarkdown.split("\n");
  const blocks: MarkdownReplaceBlock[] = [];
  const ranges: BlockRange[] = [];
  let markdownBuffer: string[] = [];
  let markdownStart: number | null = null;
  let insideFence = false;
  let fenceIndent = "";
  let markerChar: "`" | "~" | "" = "";
  let markerLen = 0;
  let lang = "";
  let codeBuffer: string[] = [];
  let fenceStart: number | null = null;
  const openRe = /^( {0,3})(`{3,}|~{3,})([^\n]*)$/;
  const flushMarkdown = (end: number) => {
    if (markdownStart === null) return;
    const text = markdownBuffer.join("\n").replace(/\n{3,}$/g, "\n\n");
    if (text.trim().length > 0) {
      blocks.push({ type: "markdown", markdown: text });
      ranges.push({ start: markdownStart, end, type: "markdown" });
    }
    markdownBuffer = [];
    markdownStart = null;
  };
  let pos = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const lineStart = pos;
    const lineEnd = pos + line.length;
    const hasNewline = index < lines.length - 1;
    const lineEndWithNewline = lineEnd + (hasNewline ? 1 : 0);
    if (!insideFence) {
      const match = line.match(openRe);
      if (!match) {
        if (markdownStart === null) markdownStart = lineStart;
        markdownBuffer.push(line);
        pos = lineEndWithNewline;
        continue;
      }
      const indent = match[1] ?? "";
      const marker = match[2] ?? "";
      const infoRaw = (match[3] ?? "").trim();
      const ch = marker[0] as "`" | "~";
      if (ch === "`" && infoRaw.includes("`")) {
        if (markdownStart === null) markdownStart = lineStart;
        markdownBuffer.push(line);
        pos = lineEndWithNewline;
        continue;
      }
      flushMarkdown(lineStart);
      insideFence = true;
      fenceIndent = indent;
      markerChar = ch;
      markerLen = marker.length;
      lang = infoRaw.split(/\s+/)[0] ?? "";
      codeBuffer = [];
      fenceStart = lineStart;
      pos = lineEndWithNewline;
      continue;
    }
    const closeRe = new RegExp(`^ {0,3}${markerChar}{${markerLen},}[ \\t]*$`);
    if (markerChar && closeRe.test(line)) {
      const raw = codeBuffer.join("\n");
      const dedented =
        fenceIndent.length > 0
          ? raw
            .split("\n")
            .map((value) =>
              value.startsWith(fenceIndent)
                ? value.slice(fenceIndent.length)
                : value,
            )
            .join("\n")
          : raw;
      blocks.push({
        type: "code",
        code: {
          language: lang ?? "text",
          code: dedented.replace(/\n+$/g, ""),
        },
      });
      ranges.push({
        start: fenceStart ?? lineStart,
        end: lineEndWithNewline,
        type: "code",
      });
      insideFence = false;
      fenceIndent = "";
      markerChar = "";
      markerLen = 0;
      lang = "";
      codeBuffer = [];
      fenceStart = null;
      pos = lineEndWithNewline;
      continue;
    }
    codeBuffer.push(line);
    pos = lineEndWithNewline;
  }
  if (insideFence) {
    return {
      blocks: [{ type: "markdown", markdown: normalizedMarkdown }],
      ranges: [{ start: 0, end: normalizedMarkdown.length, type: "markdown" }],
    };
  }
  flushMarkdown(normalizedMarkdown.length);
  if (blocks.length === 0) {
    blocks.push({ type: "markdown", markdown: "" });
    ranges.push({ start: 0, end: normalizedMarkdown.length, type: "markdown" });
  }
  return { blocks, ranges };
};



const MarkdownBlockContent = (props: MarkdownBlockContentProps) => {
  const { settings } = useUserSettings();
  const [error, setError] = React.useState<string | null>(null);
  const markdownTabSize = clampMarkdownTabSize(settings?.markdownTabSize);
  const normalizedMarkdown = React.useMemo(
    () => normalizeMarkdownEditorValue(props.markdown, markdownTabSize),
    [markdownTabSize, props.markdown],
  );
  const handleChange = React.useCallback(
    (value: string) => {
      if (props.mode !== "edit") return;
      const normalizedValue = normalizeMarkdownEditorValue(
        value,
        markdownTabSize,
      );
      if (normalizedValue.length > MAX_LENGTH) {
        setError("Markdown文字列が長すぎます（最大50,000文字）");
        return;
      }
      setError(null);
      props.onChange(normalizedValue);
    },
    [markdownTabSize, props],
  );
  const applyInsert = React.useCallback(
    (
      textarea: HTMLTextAreaElement,
      insertText: string,
      selectionStart: number,
      selectionEnd: number,
      {
        attemptSplitFences,
        focusPos,
      }: {
        attemptSplitFences: boolean;
        focusPos?: number;
      },
    ) => {
      if (props.mode !== "edit") return;
      const merged =
        props.markdown.slice(0, selectionStart) +
        insertText +
        props.markdown.slice(selectionEnd);
      if (attemptSplitFences && props.onReplaceWithBlocks) {
        const { blocks, ranges } = parseAndSplitFencesWithRanges(merged);
        const hasCode = blocks.some((block) => block.type === "code");
        if (hasCode) {
          if (!validateBlocksLength(blocks)) {
            setError("貼り付け内容が長すぎます（各ブロック最大50,000文字）");
            return;
          }
          setError(null);
          const pos = focusPos ?? selectionStart;
          const blockIndex = pickBlockIndexByPos(ranges, pos);
          props.onReplaceWithBlocks(blocks, { relativeIndex: blockIndex });
          return;
        }
      }
      handleChange(merged);
      restoreCaret(textarea, selectionStart + insertText.length);
    },
    [handleChange, props],
  );
  const handlePaste = React.useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (props.mode !== "edit") return;
    const plain = event.clipboardData.getData("text/plain");
    const html = event.clipboardData.getData("text/html");
    const value = plain.length > 0 ? plain : htmlToPlainText(html);
    if (!value) return;
    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const before = props.markdown.slice(0, selectionStart);
    const after = props.markdown.slice(selectionEnd);
    const lineStart = before.lastIndexOf("\n") + 1;
    const atLineStart = before.slice(lineStart).trim().length === 0;
    const nextNewline = after.indexOf("\n");
    const afterLine = nextNewline >= 0 ? after.slice(0, nextNewline) : after;
    const atLineEnd = afterLine.trim().length === 0;
    const normalized = normalizeMarkdownInsertionText(value, markdownTabSize);
    const insertText = html.length > 0 && looksLikeHtmlBlockCandidate(value)
      ? wrapFence(extractPreTextFromHtml(html), detectLang(value, html))
      : normalized;
    const fenced = normalizeFenceBoundaries(insertText, { atLineStart, atLineEnd });
    event.preventDefault();
    applyInsert(textarea, fenced.text, selectionStart, selectionEnd, {
      attemptSplitFences: true,
      focusPos: selectionStart + fenced.focusOffset,
    });
  }, [applyInsert, markdownTabSize, props]);
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (props.mode !== "edit") return;
    if (event.key !== "Tab") return;
    const textarea = event.currentTarget;
    const tabText = resolveMarkdownTabKeyText(
      props.markdown,
      textarea.selectionStart,
      markdownTabSize,
    );
    event.preventDefault();
    applyInsert(textarea, tabText, textarea.selectionStart, textarea.selectionEnd, {
      attemptSplitFences: false,
    });
  }, [applyInsert, markdownTabSize, props]);
  if (props.mode === "view") {
    return <MarkdownBlockDisplay markdown={props.markdown} zoom={props.zoom} />;
  }
  return (
    <MarkdownEditorDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      value={normalizedMarkdown}
      onChange={handleChange}
      onPasteCapture={handlePaste}
      onKeyDown={handleKeyDown}
      accentColor={props.accentColor}
      error={error}
    />
  );
};



export { MarkdownBlockContent };


export type { MarkdownBlockContentProps, MarkdownReplaceBlock, MarkdownReplaceFocus };
