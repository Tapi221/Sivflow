import { BlockWrapper } from "@/components/card/blocks/core/BlockWrapper";
import { MarkdownBlockDisplay } from "@/components/card/blocks/markdown/MarkdownBlockDisplay";
import { MarkdownEditorDialog } from "@/components/card/blocks/markdown/MarkdownEditorDialog";
import { cn } from "@/lib/utils";
import { NotebookPen } from "@/ui/icons";
import React, { useState } from "react";

type EditorBlock =
  | { type: "markdown"; markdown: string }
  | { type: "code"; code: { language: string; code: string } };

type ReplaceFocus = {
  /**
   * 置き換え後 blocks の中で、フォーカスさせたいブロック index（0起点）
   * - “境界ちょうど” は次（後ろ）ブロックになるように決定される
   */
  relativeIndex: number;
};

interface MarkdownBlockProps {
  markdown: string;
  onChange: (markdown: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: unknown;
  dragHandleClassName?: string;
  accentColor?: string;
  isActive?: boolean;
  showDelete?: boolean;

  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;

  onReplaceWithBlocks?: (blocks: EditorBlock[], focus?: ReplaceFocus) => void;
}

const MAX_LENGTH = 50000;

const normalizeMarkdownForEditor = (input: string) =>
  String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}$/g, "\n\n");

const normalizeMarkdownBlockValue = (input: string) =>
  normalizeMarkdownForEditor(input).replace(/\n+$/g, "");

const validateBlocksLength = (blocks: EditorBlock[]) => {
  for (const b of blocks) {
    const len = b.type === "markdown" ? b.markdown.length : b.code.code.length;
    if (len > MAX_LENGTH) return false;
  }
  return true;
};

const htmlToPlainText = (html: string) => {
  if (typeof document === "undefined") return "";
  try {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
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

const isProbablyCode = (t: string) => {
  const s = (t ?? "").trim();
  if (!s) return false;

  if (/```|~~~/.test(s)) return true;
  if (/^\s*<\w+[\s>]/m.test(s)) return true;
  if (/\b(className|function|const|let|var|import|export|return)\b/.test(s)) {
    return true;
  }
  if (/[{}();]|=>/.test(s)) return true;

  return false;
};

const looksLikeHtmlBlockCandidate = (t: string) =>
  /^\s*<\w+[\s>]/.test(t ?? "");

const detectLang = (plain: string, html: string) => {
  const m = html?.match(/language-([a-z0-9_+-]+)/i);
  if (m?.[1]) return m[1];

  if (/\bclassName=/.test(plain) || /^\s*</m.test(plain)) return "tsx";
  if (/\binterface\b|\btype\b|\bimplements\b/.test(plain)) return "ts";
  return "text";
};

const isFenceStart = (text: string) => {
  const normalized = normalizeMarkdownForEditor(text).replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim().length === 0) i += 1;
  if (i >= lines.length) return false;
  return /^( {0,3})(`{3,}|~{3,})/.test(lines[i]);
};

const computeFocusOffsetInInsertText = (insertText: string) => {
  const normalized = normalizeMarkdownForEditor(insertText).replace(
    /\r\n/g,
    "\n",
  );
  const lines = normalized.split("\n");

  let offset = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const isLast = i === lines.length - 1;

    if (line.trim().length === 0) {
      offset += line.length + (isLast ? 0 : 1);
      continue;
    }

    const m = line.match(/^( {0,3})(`{3,}|~{3,})/);
    if (m) {
      return offset + (m[1]?.length ?? 0);
    }

    return offset;
  }

  return 0;
};

const normalizeFenceBoundaries = (
  insertText: string,
  ctx: { atLineStart: boolean; atLineEnd: boolean },
): { text: string; focusOffset: number } => {
  if (!isFenceStart(insertText)) {
    return { text: insertText, focusOffset: 0 };
  }

  let out = insertText;

  if (!ctx.atLineStart && !/^\r?\n/.test(out)) {
    out = `\n${out}`;
  }

  if (!ctx.atLineEnd && !/\r?\n$/.test(out)) {
    out = `${out}\n`;
  }

  const focusOffset = computeFocusOffsetInInsertText(out);

  return { text: out, focusOffset };
};

const wrapFence = (code: string, lang: string) => {
  const c = (code ?? "").replace(/\r\n/g, "\n").replace(/\n+$/g, "");
  return `\`\`\`${lang}\n${c}\n\`\`\`\n`;
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

    return div.textContent || div.innerText || "";
  } catch {
    return "";
  }
};

type BlockRange = { start: number; end: number; type: EditorBlock["type"] };

const pickBlockIndexByPos = (ranges: BlockRange[], pos: number) => {
  for (let i = 0; i < ranges.length; i += 1) {
    const r = ranges[i];
    if (pos >= r.start && pos < r.end) return i;
  }
  return Math.max(0, ranges.length - 1);
};

const MarkdownBlockInner: React.FC<MarkdownBlockProps> = ({
  markdown,
  onChange,
  onDelete,
  onDuplicate,
  dragHandleProps,
  dragHandleClassName,
  accentColor,
  isActive,
  showDelete,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
  onReplaceWithBlocks,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const normalizedMarkdown = normalizeMarkdownBlockValue(markdown);
  const isMarkdownEmpty = normalizedMarkdown.trim().length === 0;

  const handleChange = (value: string) => {
    const normalizedValue = normalizeMarkdownBlockValue(value);

    if (normalizedValue.length > MAX_LENGTH) {
      setError("Markdown文字列が長すぎます（最大50,000文字）");
      return;
    }
    setError(null);
    onChange(normalizedValue);
  };

  const applyInsert = (
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
    const normalized = normalizeMarkdownForEditor(insertText);
    const merged =
      markdown.slice(0, selectionStart) +
      normalized +
      markdown.slice(selectionEnd);

    if (attemptSplitFences && onReplaceWithBlocks) {
      const { blocks, ranges } = parseAndSplitFencesWithRanges(merged);
      const hasCode = blocks.some((b) => b.type === "code");

      if (hasCode) {
        if (!validateBlocksLength(blocks)) {
          setError("貼り付け内容が長すぎます（各ブロック最大50,000文字）");
          return;
        }
        setError(null);

        const pos = focusPos ?? selectionStart;
        const relativeIndex = pickBlockIndexByPos(ranges, pos);
        onReplaceWithBlocks(blocks, { relativeIndex });
        return;
      }
    }

    if (merged.length > MAX_LENGTH) {
      setError("貼り付け内容が長すぎます（1ブロック最大50,000文字）");
      return;
    }

    handleChange(merged);
    const nextCaret = selectionStart + normalized.length;
    restoreCaret(textarea, nextCaret);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    const html = clipboardData.getData("text/html");
    const plain = clipboardData.getData("text/plain");

    const textarea = e.currentTarget;

    const baseLen = markdown.length;
    const a = Math.min(textarea.selectionStart ?? 0, baseLen);
    const b = Math.min(textarea.selectionEnd ?? 0, baseLen);
    const selectionStart = Math.min(a, b);
    const selectionEnd = Math.max(a, b);

    const prevChar = selectionStart > 0 ? markdown[selectionStart - 1] : "";
    const nextChar =
      selectionEnd < markdown.length ? markdown[selectionEnd] : "";
    const atLineStart =
      selectionStart === 0 || prevChar === "\n" || prevChar === "\r";
    const atLineEnd =
      selectionEnd === markdown.length ||
      nextChar === "\n" ||
      nextChar === "\r";

    if (plain && isProbablyCode(plain)) {
      e.preventDefault();

      const lang = detectLang(plain, html);

      let insertText =
        looksLikeHtmlBlockCandidate(plain) && !/```|~~~/.test(plain)
          ? wrapFence(plain, lang)
          : plain;

      const normalizedFence = normalizeFenceBoundaries(insertText, {
        atLineStart,
        atLineEnd,
      });
      insertText = normalizedFence.text;

      applyInsert(textarea, insertText, selectionStart, selectionEnd, {
        attemptSplitFences: true,
        focusPos: selectionStart + normalizedFence.focusOffset,
      });
      return;
    }

    if (html && html.trim()) {
      e.preventDefault();

      if (/<pre[\s>]/i.test(html)) {
        const raw = plain || extractPreTextFromHtml(html);
        const preText = normalizeMarkdownForEditor(raw);

        const lang = detectLang(preText, html);
        let insertText = isFenceStart(preText)
          ? preText
          : wrapFence(preText, lang);

        const normalizedFence = normalizeFenceBoundaries(insertText, {
          atLineStart,
          atLineEnd,
        });
        insertText = normalizedFence.text;

        applyInsert(textarea, insertText, selectionStart, selectionEnd, {
          attemptSplitFences: true,
          focusPos: selectionStart + normalizedFence.focusOffset,
        });
        return;
      }

      try {
        const { sanitizeAndConvertToMarkdown } =
          await import("@/utils/markdownPaste");
        const mdRaw = await sanitizeAndConvertToMarkdown(html);

        const overEscaped =
          /className=\\"/.test(mdRaw) || /\\_/.test(mdRaw) || /\\</.test(mdRaw);

        const fallbackText = plain || htmlToPlainText(html);
        let insertText =
          mdRaw && mdRaw.trim().length > 0 ? mdRaw : fallbackText;

        if (plain && overEscaped) insertText = fallbackText;

        if (
          looksLikeHtmlBlockCandidate(insertText) &&
          !/```|~~~/.test(insertText)
        ) {
          insertText = wrapFence(insertText, detectLang(insertText, html));
        }

        const normalizedFence = normalizeFenceBoundaries(insertText, {
          atLineStart,
          atLineEnd,
        });
        insertText = normalizedFence.text;

        applyInsert(textarea, insertText, selectionStart, selectionEnd, {
          attemptSplitFences: true,
          focusPos: selectionStart + normalizedFence.focusOffset,
        });
      } catch {
        const fallbackText = plain || htmlToPlainText(html);
        let insertText =
          looksLikeHtmlBlockCandidate(fallbackText) &&
          !/```|~~~/.test(fallbackText)
            ? wrapFence(fallbackText, detectLang(fallbackText, html))
            : fallbackText;

        const normalizedFence = normalizeFenceBoundaries(insertText, {
          atLineStart,
          atLineEnd,
        });
        insertText = normalizedFence.text;

        applyInsert(textarea, insertText, selectionStart, selectionEnd, {
          attemptSplitFences: true,
          focusPos: selectionStart + normalizedFence.focusOffset,
        });
      }
      return;
    }

    if (plain && /```|~~~/.test(plain) && onReplaceWithBlocks) {
      e.preventDefault();

      let insertText = plain;

      const normalizedFence = normalizeFenceBoundaries(insertText, {
        atLineStart,
        atLineEnd,
      });
      insertText = normalizedFence.text;

      applyInsert(textarea, insertText, selectionStart, selectionEnd, {
        attemptSplitFences: true,
        focusPos: selectionStart + normalizedFence.focusOffset,
      });
    }
  };

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      className={cn("bg-transparent px-0 py-0", !isMarkdownEmpty && "border-0")}
      contentClassName="px-0"
      label="Markdown"
      icon={NotebookPen}
      accentColor={accentColor}
      isActive={Boolean(isActive || isEditorOpen)}
      showDelete={showDelete}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
    >
      <MarkdownBlockDisplay
        markdown={normalizedMarkdown}
        interactive={true}
        data-testid="markdown-preview"
        tabIndex={0}
        role="button"
        ariaLabel="Markdownを編集"
        onClick={() => setIsEditorOpen(true)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setIsEditorOpen(true);
        }}
      />

      <MarkdownEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        value={normalizedMarkdown}
        onChange={handleChange}
        onPasteCapture={handlePaste}
        accentColor={accentColor}
        error={error}
      />
    </BlockWrapper>
  );
};

const areMarkdownBlockPropsEqual = (
  prev: MarkdownBlockProps,
  next: MarkdownBlockProps,
) =>
  prev.markdown === next.markdown &&
  prev.dragHandleClassName === next.dragHandleClassName &&
  prev.accentColor === next.accentColor &&
  prev.isActive === next.isActive &&
  prev.showDelete === next.showDelete &&
  prev.canMoveUp === next.canMoveUp &&
  prev.canMoveDown === next.canMoveDown;

export const MarkdownBlock = React.memo(
  MarkdownBlockInner,
  areMarkdownBlockPropsEqual,
);

MarkdownBlock.displayName = "MarkdownBlock";

const parseAndSplitFencesWithRanges = (md: string) => {
  const normalizedMd = md.replace(/\r\n/g, "\n");
  const lines = normalizedMd.split("\n");

  const blocks: EditorBlock[] = [];
  const ranges: BlockRange[] = [];

  let markdownBuf: string[] = [];
  let markdownStart: number | null = null;

  let insideFence = false;
  let fenceIndent = "";
  let markerChar: "`" | "~" | "" = "";
  let markerLen = 0;
  let lang = "";
  let codeBuf: string[] = [];

  let fenceStart: number | null = null;

  const openRe = /^( {0,3})(`{3,}|~{3,})([^\n]*)$/;

  const flushMarkdown = (end: number) => {
    if (markdownStart === null) return;

    const text = markdownBuf.join("\n").replace(/\n{3,}$/g, "\n\n");

    if (text.trim().length > 0) {
      blocks.push({ type: "markdown", markdown: text });
      ranges.push({ start: markdownStart, end, type: "markdown" });
    }
    markdownBuf = [];
    markdownStart = null;
  };

  let pos = 0;
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const lineStart = pos;
    const lineEnd = pos + line.length;
    const hasNewline = idx < lines.length - 1;
    const lineEndWithNewline = lineEnd + (hasNewline ? 1 : 0);

    if (!insideFence) {
      const m = line.match(openRe);
      if (!m) {
        if (markdownStart === null) markdownStart = lineStart;
        markdownBuf.push(line);
        pos = lineEndWithNewline;
        continue;
      }

      const indent = m[1] ?? "";
      const marker = m[2] ?? "";
      const infoRaw = (m[3] ?? "").trim();
      const ch = marker[0] as "`" | "~";

      if (ch === "`" && infoRaw.includes("`")) {
        if (markdownStart === null) markdownStart = lineStart;
        markdownBuf.push(line);
        pos = lineEndWithNewline;
        continue;
      }

      flushMarkdown(lineStart);

      insideFence = true;
      fenceIndent = indent;
      markerChar = ch;
      markerLen = marker.length;
      lang = infoRaw.split(/\s+/)[0] ?? "";
      codeBuf = [];
      fenceStart = lineStart;

      pos = lineEndWithNewline;
      continue;
    }

    const closeRe = new RegExp(`^ {0,3}${markerChar}{${markerLen},}[ \\t]*$`);
    if (markerChar && closeRe.test(line)) {
      const raw = codeBuf.join("\n");
      const dedented =
        fenceIndent.length > 0
          ? raw
              .split("\n")
              .map((l) =>
                l.startsWith(fenceIndent) ? l.slice(fenceIndent.length) : l,
              )
              .join("\n")
          : raw;

      blocks.push({
        type: "code",
        code: { language: lang || "text", code: dedented.replace(/\n+$/, "") },
      });

      const start = fenceStart ?? lineStart;
      const end = lineEndWithNewline;
      ranges.push({ start, end, type: "code" });

      insideFence = false;
      fenceIndent = "";
      markerChar = "";
      markerLen = 0;
      lang = "";
      codeBuf = [];
      fenceStart = null;

      pos = lineEndWithNewline;
      continue;
    }

    codeBuf.push(line);
    pos = lineEndWithNewline;
  }

  if (insideFence) {
    return {
      blocks: [{ type: "markdown", markdown: normalizedMd }],
      ranges: [{ start: 0, end: normalizedMd.length, type: "markdown" }],
    };
  }

  flushMarkdown(normalizedMd.length);

  if (blocks.length === 0) {
    blocks.push({ type: "markdown", markdown: "" });
    ranges.push({ start: 0, end: normalizedMd.length, type: "markdown" });
  }

  return { blocks, ranges };
};
