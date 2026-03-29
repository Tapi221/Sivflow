import React, { useState } from "react";
import { NotebookPen } from "@/ui/icons";
import { BlockWrapper } from "./BlockWrapper";
import { MarkdownBlockView } from "./MarkdownBlockPreview";
import { MarkdownEditorDialog } from "./MarkdownEditorDialog";
import { TEXT_BLOCK_CONTENT_CLASS } from "./textBlockStyles";
import { cn } from "@/lib/utils";

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

  // ---- 1行移動（rowOffset）用 ----
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;

  /**
   * ブロック列を差し替えるコールバック（ペースト分離用）
   * - 分割が起きた場合、focus.relativeIndex を使って「どのブロックへフォーカスするか」を親が決められる
   */
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

/** plain が「コードっぽい」かざっくり判定（現実運用向けに雑で良い） */
const isProbablyCode = (t: string) => {
  const s = (t ?? "").trim();
  if (!s) return false;

  if (/```|~~~/.test(s)) return true; // 既にフェンス
  if (/^\s*<\w+[\s>]/m.test(s)) return true; // <body ...> など
  if (/\b(className|function|const|let|var|import|export|return)\b/.test(s))
    return true;
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

// CommonMark寄せ: 先頭の空行だけスキップし、最初の非空行が 0〜3スペース + fence なら true
const isFenceStart = (text: string) => {
  const normalized = normalizeMarkdownForEditor(text).replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim().length === 0) i++;
  if (i >= lines.length) return false;
  return /^( {0,3})(`{3,}|~{3,})/.test(lines[i]);
};

/**
 * insertText の先頭から「フォーカス判定に使うべき位置」までの offset を返す。
 * - 先頭の空行はスキップ
 * - 最初の非空行が CommonMark 的に有効な fence なら、その fence marker(```/~~~) の位置を返す
 * - fence でなければ最初の非空行の行頭を返す
 *
 * これにより、insertText 側にもともと付いている "\n" や空行があってもズレない。
 */
const computeFocusOffsetInInsertText = (insertText: string) => {
  const normalized = normalizeMarkdownForEditor(insertText).replace(
    /\r\n/g,
    "\n",
  );
  const lines = normalized.split("\n");

  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const isLast = i === lines.length - 1;

    if (line.trim().length === 0) {
      // 空行はスキップ（offset は「その行 + 改行1文字」進む）
      offset += line.length + (isLast ? 0 : 1);
      continue;
    }

    const m = line.match(/^( {0,3})(`{3,}|~{3,})/);
    if (m) {
      // marker の位置（行頭 + 0〜3スペースぶん）
      return offset + (m[1]?.length ?? 0);
    }

    // fence でない通常行：その行頭を返す
    return offset;
  }

  return 0;
};

/**
 * フェンスを行境界に寄せる（行途中に貼ると壊れやすい対策）
 * - fence が先頭に来るなら、必要に応じて前後に改行を補う
 * - focusOffset は「実際の fence/先頭非空行」に寄せた offset を返す（貼り付け側に元空行があってもズレない）
 */
const normalizeFenceBoundaries = (
  insertText: string,
  ctx: { atLineStart: boolean; atLineEnd: boolean },
): { text: string; focusOffset: number } => {
  // fence開始と判定できるものだけ境界補正を走らせる（誤爆防止）
  if (!isFenceStart(insertText)) {
    return { text: insertText, focusOffset: 0 };
  }

  let out = insertText;

  // 行途中にフェンスを入れると壊れやすいので、前に改行を足す
  if (!ctx.atLineStart && !/^\r?\n/.test(out)) {
    out = `\n${out}`;
  }

  // 後続テキストと結合して壊れるのを避ける（フェンス末尾に改行が無いペースト対策）
  if (!ctx.atLineEnd && !/\r?\n$/.test(out)) out = `${out}\n`;

  // ✅ 「自分が足した \n」も「元からの空行」も含め、実際の fence 開始（or 最初の非空行）へ寄せる
  const focusOffset = computeFocusOffsetInInsertText(out);

  return { text: out, focusOffset };
};

const wrapFence = (code: string, lang: string) => {
  const c = (code ?? "").replace(/\r\n/g, "\n").replace(/\n+$/, "");
  // 閉じフェンス後に必ず改行（後ろと結合して壊れるのを防ぐ）
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
  // end 排他: start <= pos < end
  // “境界ちょうど” = pos === 前end === 次start なので、次（後ろ）ブロックに入る
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (pos >= r.start && pos < r.end) return i;
  }
  return Math.max(0, ranges.length - 1);
};

/**
 * Markdownブロック（編集用）
 * textarea入力 + リアルタイムプレビュー
 */
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

  // move props
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
      /** 分割時のフォーカス判定に使う merged 上の座標（未指定なら selectionStart） */
      focusPos?: number;
    },
  ) => {
    const normalized = normalizeMarkdownForEditor(insertText);
    const merged =
      markdown.slice(0, selectionStart) +
      normalized +
      markdown.slice(selectionEnd);

    // 分割できるなら「最終保存される各ブロック」単位で長さチェックして置き換え
    if (attemptSplitFences && onReplaceWithBlocks) {
      const { blocks, ranges } = parseAndSplitFencesWithRanges(merged);
      const hasCode = blocks.some((b) => b.type === "code");

      if (hasCode) {
        if (!validateBlocksLength(blocks)) {
          setError("貼り付け内容が長すぎます（各ブロック最大50,000文字）");
          return;
        }
        setError(null);

        // ✅ insertText 先頭ではなく「実際の fence/先頭非空行」に寄せた座標で判定する
        const pos = focusPos ?? selectionStart;
        const relativeIndex = pickBlockIndexByPos(ranges, pos);
        onReplaceWithBlocks(blocks, { relativeIndex });
        return;
      }
    }

    // 分割しないなら「このブロックに保存される最終文字列(merged)」でチェック
    if (merged.length > MAX_LENGTH) {
      setError("貼り付け内容が長すぎます（1ブロック最大50,000文字）");
      return;
    }

    // 分離不要なら通常挿入（state更新 + カーソル復元）
    handleChange(merged);
    const nextCaret = selectionStart + normalized.length;
    restoreCaret(textarea, nextCaret);
  };

  /**
   * ペースト処理（安定運用版）：
   * - ChatGPT等のリッチHTMLがあっても、plainがコードっぽいなら plain を優先
   * - 先頭が <tag...> の場合は Markdown の HTMLブロック化を避けるため fenced code に包む
   * - HTML→MD 変換結果が過剰エスケープっぽい時は plain にフォールバック
   */
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    const html = clipboardData.getData("text/html");
    const plain = clipboardData.getData("text/plain");

    const textarea = e.currentTarget;

    // selection の逆転や範囲外を保険で正規化
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

    // 1) plain がコードっぽいなら、HTMLがあっても plain を優先（ここが本丸）
    if (plain && isProbablyCode(plain)) {
      e.preventDefault();

      const lang = detectLang(plain, html);

      // 先頭が <tag...> だと Markdown が HTML ブロック扱いするのでフェンスで包む
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

    // 2) HTML がある場合：基本は sanitize→Markdown 化。ただし <pre> 系はテキスト抽出優先
    if (html && html.trim()) {
      e.preventDefault();

      // <pre> があるなら converter を通すより素直に抜く方が事故らない
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

        // converter が過剰エスケープしてるときは plain に逃がす
        const overEscaped =
          /className=\\"/.test(mdRaw) || /\\_/.test(mdRaw) || /\\</.test(mdRaw);

        const fallbackText = plain || htmlToPlainText(html);
        let insertText =
          mdRaw && mdRaw.trim().length > 0 ? mdRaw : fallbackText;

        if (plain && overEscaped) insertText = fallbackText;

        // 先頭が <tag...> なら HTML ブロック化を避けるためフェンス化
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
        // フォールバック: plain を優先。無ければ HTML をテキスト化して挿入
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

    // 3) text/plain のみ → コードフェンスチェック（``` / ~~~）
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
      return;
    }

    // それ以外 → ブラウザのデフォールト動作に委ねる
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
      isActive={isActive}
      showDelete={showDelete}
      // 1行移動
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
    >
      <div className="px-0 py-0">
        <div
          className={cn(
            "markdownBlockPreview bg-transparent border-0 rounded-lg overflow-visible cursor-text",
            "p-0",
          )}
          data-testid="markdown-preview"
          tabIndex={0}
          role="button"
          aria-label="Markdownを編集"
          onClick={() => setIsEditorOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            setIsEditorOpen(true);
          }}
        >
          {isMarkdownEmpty ? (
            <div
              className={cn(
                TEXT_BLOCK_CONTENT_CLASS,
                "min-h-[24px] text-slate-300",
              )}
            >
              Markdownを入力...
            </div>
          ) : (
            <MarkdownBlockView
              md={normalizedMarkdown}
              className="markdownBlockCardView"
              bleedX={false}
            />
          )}
        </div>

        <MarkdownEditorDialog
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          value={normalizedMarkdown}
          onChange={handleChange}
          onPasteCapture={handlePaste}
          accentColor={accentColor}
          error={error}
        />
      </div>
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

/**
 * Markdown文字列をコードフェンスで分割し、
 * blocks に加えて「元文字列内での範囲（start/end）」も返す。
 *
 * 重要:
 * - インデント付きフェンス（リスト内の ```）に対応（CommonMark: 先頭0〜3スペース）
 * - ``` と ~~~ の両対応
 * - unclosed fence は分割しない（1つの markdown ブロックとして返す）
 *
 * 範囲の判定は end 排他（start <= pos < end）で、
 * “境界ちょうど” は次（後ろ）ブロックに属する。
 */
function parseAndSplitFencesWithRanges(md: string): {
  blocks: EditorBlock[];
  ranges: BlockRange[];
} {
  const normalizedMd = md.replace(/\r\n/g, "\n");
  const lines = normalizedMd.split("\n");

  const blocks: EditorBlock[] = [];
  const ranges: BlockRange[] = [];

  let markdownBuf: string[] = [];
  let markdownStart: number | null = null;

  let insideFence = false;
  let fenceIndent = "";
  let markerChar: "`" | "~" | null = null;
  let markerLen = 0;
  let lang = "";
  let codeBuf: string[] = [];

  let fenceStart: number | null = null;

  const openRe = /^( {0,3})(`{3,}|~{3,})([^\n]*)$/;

  const flushMarkdown = (end: number) => {
    if (markdownStart === null) return;

    // 旧版と同じ：末尾の過剰改行は \n\n に整える
    const text = markdownBuf.join("\n").replace(/\n{3,}$/g, "\n\n");

    if (text.trim().length > 0) {
      blocks.push({ type: "markdown", markdown: text });
      ranges.push({ start: markdownStart, end, type: "markdown" });
    }
    markdownBuf = [];
    markdownStart = null;
  };

  let pos = 0; // normalizedMd 内の現在位置（\nもカウント）
  for (let idx = 0; idx < lines.length; idx++) {
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

      // CommonMark: backtick fence の info string に backtick は不可
      if (ch === "`" && infoRaw.includes("`")) {
        if (markdownStart === null) markdownStart = lineStart;
        markdownBuf.push(line);
        pos = lineEndWithNewline;
        continue;
      }

      // markdown を確定（フェンス行の直前まで）
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

    // closing fence: up to 3 spaces + same marker repeated >= opening length + trailing spaces only
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
      const end = lineEndWithNewline; // 閉じフェンス行まで含める
      ranges.push({ start, end, type: "code" });

      // reset
      insideFence = false;
      fenceIndent = "";
      markerChar = null;
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

  // unclosed fence は分割しない
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
}




