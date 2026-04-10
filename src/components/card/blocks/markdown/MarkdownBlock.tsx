import { BlockWrapper } from "@/components/card/blocks/core/BlockWrapper";
import { MarkdownBlockDisplay } from "@/components/card/blocks/markdown/MarkdownBlockDisplay";
import { MarkdownEditorDialog } from "@/components/card/blocks/markdown/MarkdownEditorDialog";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
import { NotebookPen } from "@/ui/icons";
import {
  clampMarkdownTabSize,
  normalizeMarkdownEditorValue,
  normalizeMarkdownInsertionText,
  resolveMarkdownTabKeyText,
} from "@/utils/markdownWhitespace";
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

const validateBlocksLength = (blocks: EditorBlock[]) => {
  for (const block of blocks) {
    const len =
      block.type === "markdown"
        ? block.markdown.length
        : block.code.code.length;
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

const isProbablyCode = (value: string) => {
  const source = (value ?? "").trim();
  if (!source) return false;

  if (/```|~~~/.test(source)) return true;
  if (/^\s*<\w+[\s>]/m.test(source)) return true;
  if (
    /\b(className|function|const|let|var|import|export|return)\b/.test(source)
  ) {
    return true;
  }
  if (/[{}();]|=>/.test(source)) return true;

  return false;
};

const looksLikeHtmlBlockCandidate = (value: string) => {
  return /^\s*<\w+[\s>]/.test(value ?? "");
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

  while (index < lines.length && lines[index]?.trim().length === 0) {
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

  return {
    text: out,
    focusOffset: computeFocusOffsetInInsertText(out),
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

    return div.textContent || div.innerText || "";
  } catch {
    return "";
  }
};

type BlockRange = { start: number; end: number; type: EditorBlock["type"] };

const pickBlockIndexByPos = (ranges: BlockRange[], pos: number) => {
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    if (!range) continue;
    if (pos >= range.start && pos < range.end) return index;
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
  const { settings } = useUserSettings();

  const markdownTabSize = clampMarkdownTabSize(settings?.markdownTabSize);
  const normalizedMarkdown = normalizeMarkdownEditorValue(
    markdown,
    markdownTabSize,
  );
  const isMarkdownEmpty = normalizedMarkdown.trim().length === 0;

  const handleChange = (value: string) => {
    const normalizedValue = normalizeMarkdownEditorValue(
      value,
      markdownTabSize,
    );

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
    const merged =
      markdown.slice(0, selectionStart) +
      insertText +
      markdown.slice(selectionEnd);

    if (attemptSplitFences && onReplaceWithBlocks) {
      const { blocks, ranges } = parseAndSplitFencesWithRanges(merged);
      const hasCode = blocks.some((block) => block.type === "code");

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

    const normalizedMerged = normalizeMarkdownEditorValue(
      merged,
      markdownTabSize,
    );
    if (normalizedMerged.length > MAX_LENGTH) {
      setError("貼り付け内容が長すぎます（1ブロック最大50,000文字）");
      return;
    }

    handleChange(merged);
    const nextCaret = selectionStart + insertText.length;
    restoreCaret(textarea, nextCaret);
  };

  const handlePaste = async (
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const clipboardData = event.clipboardData;
    const html = clipboardData.getData("text/html");
    const plain = clipboardData.getData("text/plain");

    const textarea = event.currentTarget;
    const baseLen = markdown.length;

    const rawStart = Math.min(textarea.selectionStart ?? 0, baseLen);
    const rawEnd = Math.min(textarea.selectionEnd ?? 0, baseLen);
    const selectionStart = Math.min(rawStart, rawEnd);
    const selectionEnd = Math.max(rawStart, rawEnd);

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
      event.preventDefault();

      const lang = detectLang(plain, html);

      let insertText =
        looksLikeHtmlBlockCandidate(plain) && !/```|~~~/.test(plain)
          ? wrapFence(plain, lang)
          : plain;

      insertText = normalizeMarkdownInsertionText(insertText, markdownTabSize);

      const normalizedFence = normalizeFenceBoundaries(insertText, {
        atLineStart,
        atLineEnd,
      });

      applyInsert(
        textarea,
        normalizedFence.text,
        selectionStart,
        selectionEnd,
        {
          attemptSplitFences: true,
          focusPos: selectionStart + normalizedFence.focusOffset,
        },
      );
      return;
    }

    if (html && html.trim()) {
      event.preventDefault();

      if (/<pre[\s>]/i.test(html)) {
        const raw = plain || extractPreTextFromHtml(html);
        const preText = normalizeMarkdownInsertionText(raw, markdownTabSize);
        const lang = detectLang(preText, html);

        const insertText = isFenceStart(preText)
          ? preText
          : wrapFence(preText, lang);

        const normalizedFence = normalizeFenceBoundaries(insertText, {
          atLineStart,
          atLineEnd,
        });

        applyInsert(
          textarea,
          normalizedFence.text,
          selectionStart,
          selectionEnd,
          {
            attemptSplitFences: true,
            focusPos: selectionStart + normalizedFence.focusOffset,
          },
        );
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

        if (plain && overEscaped) {
          insertText = fallbackText;
        }

        if (
          looksLikeHtmlBlockCandidate(insertText) &&
          !/```|~~~/.test(insertText)
        ) {
          insertText = wrapFence(insertText, detectLang(insertText, html));
        }

        insertText = normalizeMarkdownInsertionText(
          insertText,
          markdownTabSize,
        );

        const normalizedFence = normalizeFenceBoundaries(insertText, {
          atLineStart,
          atLineEnd,
        });

        applyInsert(
          textarea,
          normalizedFence.text,
          selectionStart,
          selectionEnd,
          {
            attemptSplitFences: true,
            focusPos: selectionStart + normalizedFence.focusOffset,
          },
        );
      } catch {
        const fallbackText = plain || htmlToPlainText(html);

        let insertText =
          looksLikeHtmlBlockCandidate(fallbackText) &&
          !/```|~~~/.test(fallbackText)
            ? wrapFence(fallbackText, detectLang(fallbackText, html))
            : fallbackText;

        insertText = normalizeMarkdownInsertionText(
          insertText,
          markdownTabSize,
        );

        const normalizedFence = normalizeFenceBoundaries(insertText, {
          atLineStart,
          atLineEnd,
        });

        applyInsert(
          textarea,
          normalizedFence.text,
          selectionStart,
          selectionEnd,
          {
            attemptSplitFences: true,
            focusPos: selectionStart + normalizedFence.focusOffset,
          },
        );
      }
      return;
    }

    if (plain) {
      event.preventDefault();

      const insertText = normalizeMarkdownInsertionText(plain, markdownTabSize);

      if (/```|~~~/.test(insertText) && onReplaceWithBlocks) {
        const normalizedFence = normalizeFenceBoundaries(insertText, {
          atLineStart,
          atLineEnd,
        });

        applyInsert(
          textarea,
          normalizedFence.text,
          selectionStart,
          selectionEnd,
          {
            attemptSplitFences: true,
            focusPos: selectionStart + normalizedFence.focusOffset,
          },
        );
        return;
      }

      applyInsert(textarea, insertText, selectionStart, selectionEnd, {
        attemptSplitFences: false,
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;

    event.preventDefault();

    const textarea = event.currentTarget;
    const baseLen = markdown.length;

    const rawStart = Math.min(textarea.selectionStart ?? 0, baseLen);
    const rawEnd = Math.min(textarea.selectionEnd ?? 0, baseLen);
    const selectionStart = Math.min(rawStart, rawEnd);
    const selectionEnd = Math.max(rawStart, rawEnd);

    const insertText = resolveMarkdownTabKeyText(
      markdown,
      selectionStart,
      markdownTabSize,
    );

    applyInsert(textarea, insertText, selectionStart, selectionEnd, {
      attemptSplitFences: false,
    });
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
        onKeyDown={handleKeyDown}
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

const parseAndSplitFencesWithRanges = (
  md: string,
): { blocks: EditorBlock[]; ranges: BlockRange[] } => {
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
        markdownBuf.push(line);
        pos = lineEndWithNewline;
        continue;
      }

      const indent = match[1] ?? "";
      const marker = match[2] ?? "";
      const infoRaw = (match[3] ?? "").trim();
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

    const closeRe = new RegExp(`^ {0,3}${markerChar}{${markerLen},}[ \t]*$`);
    if (markerChar && closeRe.test(line)) {
      const raw = codeBuf.join("\n");
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
          language: lang || "text",
          code: dedented.replace(/\n+$/, ""),
        },
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
      ranges: [
        { start: 0, end: normalizedMd.length, type: "markdown" as const },
      ],
    };
  }

  flushMarkdown(normalizedMd.length);

  if (blocks.length === 0) {
    blocks.push({ type: "markdown", markdown: "" });
    ranges.push({ start: 0, end: normalizedMd.length, type: "markdown" });
  }

  return { blocks, ranges };
};
