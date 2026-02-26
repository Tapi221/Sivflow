import React, { useState } from 'react';
import NotebookPenIcon from 'lucide-react/dist/esm/icons/notebook-pen';
import { BlockWrapper } from './BlockWrapper';
import { MarkdownBlockView } from './MarkdownBlockPreview';
import { MarkdownEditorDialog } from './MarkdownEditorDialog';
import { TEXT_BLOCK_CONTENT_CLASS } from './textBlockStyles';
import { cn } from '@/lib/utils';

type EditorBlock =
  | { type: 'markdown'; markdown: string }
  | { type: 'code'; code: { language: string; code: string } };

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

  /** ブロック列を差し替えるコールバック（ペースト分離用） */
  onReplaceWithBlocks?: (blocks: EditorBlock[]) => void;
}

const MAX_LENGTH = 50000;

const normalizeMarkdownForEditor = (input: string) =>
  String(input ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}$/g, '\n\n');

const validateBlocksLength = (blocks: EditorBlock[]) => {
  for (const b of blocks) {
    const len = b.type === 'markdown' ? b.markdown.length : b.code.code.length;
    if (len > MAX_LENGTH) return false;
  }
  return true;
};

const htmlToPlainText = (html: string) => {
  if (typeof document === 'undefined') return '';
  try {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  } catch {
    return '';
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
  const s = (t ?? '').trim();
  if (!s) return false;

  if (/```|~~~/.test(s)) return true; // 既にフェンス
  if (/^\s*<\w+[\s>]/m.test(s)) return true; // <body ...> など
  if (/\b(className|function|const|let|var|import|export|return)\b/.test(s)) return true;
  if (/[{}();]|=>/.test(s)) return true;

  return false;
};

const looksLikeHtmlBlockCandidate = (t: string) => /^\s*<\w+[\s>]/.test(t ?? '');

const detectLang = (plain: string, html: string) => {
  const m = html?.match(/language-([a-z0-9_+-]+)/i);
  if (m?.[1]) return m[1];

  if (/\bclassName=/.test(plain) || /^\s*</m.test(plain)) return 'tsx';
  if (/\binterface\b|\btype\b|\bimplements\b/.test(plain)) return 'ts';
  return 'text';
};

const wrapFence = (code: string, lang: string) => {
  const c = (code ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '');
  return `\n\`\`\`${lang}\n${c}\n\`\`\`\n`;
};

const extractPreTextFromHtml = (html: string) => {
  if (typeof document === 'undefined') return '';
  try {
    const div = document.createElement('div');
    div.innerHTML = html;

    const pre = div.querySelector('pre');
    if (pre?.textContent) return pre.textContent;

    return div.textContent || div.innerText || '';
  } catch {
    return '';
  }
};

/**
 * Markdownブロック（編集用）
 * textarea入力 + リアルタイムプレビュー
 */
export const MarkdownBlock: React.FC<MarkdownBlockProps> = ({
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
  const isMarkdownEmpty = markdown.trim().length === 0;

  const handleChange = (value: string) => {
    if (value.length > MAX_LENGTH) {
      setError('Markdown文字列が長すぎます（最大50,000文字）');
      return;
    }
    setError(null);
    onChange(value);
  };

  const applyInsert = (
    textarea: HTMLTextAreaElement,
    insertText: string,
    selectionStart: number,
    selectionEnd: number,
    { attemptSplitFences }: { attemptSplitFences: boolean }
  ) => {
    const normalized = normalizeMarkdownForEditor(insertText);
    const merged = markdown.slice(0, selectionStart) + normalized + markdown.slice(selectionEnd);

    // 全体が長すぎる場合は通常挿入でも弾く
    if (merged.length > MAX_LENGTH) {
      setError('貼り付け内容が長すぎます（最大50,000文字）');
      return;
    }

    if (attemptSplitFences && onReplaceWithBlocks) {
      const blocks = parseAndSplitFences(merged);
      const hasCode = blocks.some((b) => b.type === 'code');
      if (hasCode) {
        if (!validateBlocksLength(blocks)) {
          setError('貼り付け内容が長すぎます（各ブロック最大50,000文字）');
          return;
        }
        setError(null);
        onReplaceWithBlocks(blocks);
        return;
      }
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
    const html = clipboardData.getData('text/html');
    const plain = clipboardData.getData('text/plain');

    const textarea = e.currentTarget;

    // selection の逆転や範囲外を保険で正規化
    const baseLen = markdown.length;
    const a = Math.min(textarea.selectionStart ?? 0, baseLen);
    const b = Math.min(textarea.selectionEnd ?? 0, baseLen);
    const selectionStart = Math.min(a, b);
    const selectionEnd = Math.max(a, b);

    // 1) plain がコードっぽいなら、HTMLがあっても plain を優先（ここが本丸）
    if (plain && isProbablyCode(plain)) {
      e.preventDefault();

      const lang = detectLang(plain, html);

      // 先頭が <tag...> だと Markdown が HTML ブロック扱いするのでフェンスで包む
      const insertText =
        looksLikeHtmlBlockCandidate(plain) && !/```|~~~/.test(plain)
          ? wrapFence(plain, lang)
          : plain;

      applyInsert(textarea, insertText, selectionStart, selectionEnd, {
        attemptSplitFences: true,
      });
      return;
    }

    // 2) HTML がある場合：基本は sanitize→Markdown 化。ただし <pre> 系はテキスト抽出優先
    if (html && html.trim()) {
      e.preventDefault();

      // <pre> があるなら converter を通すより素直に抜く方が事故らない
      if (/<pre[\s>]/i.test(html)) {
        const preText = plain || extractPreTextFromHtml(html);
        const lang = detectLang(preText, html);
        const fenced = wrapFence(preText, lang);

        applyInsert(textarea, fenced, selectionStart, selectionEnd, {
          attemptSplitFences: true,
        });
        return;
      }

      try {
        const { sanitizeAndConvertToMarkdown } = await import('@/utils/markdownPaste');
        const mdRaw = await sanitizeAndConvertToMarkdown(html);

        // converter が過剰エスケープしてるときは plain に逃がす
        const overEscaped =
          /className=\\"/.test(mdRaw) ||
          /\\_/.test(mdRaw) ||
          /\\</.test(mdRaw);

        const fallbackText = plain || htmlToPlainText(html);
        let insertText = mdRaw && mdRaw.trim().length > 0 ? mdRaw : fallbackText;

        if (plain && overEscaped) insertText = fallbackText;

        // 先頭が <tag...> なら HTML ブロック化を避けるためフェンス化
        if (looksLikeHtmlBlockCandidate(insertText) && !/```|~~~/.test(insertText)) {
          insertText = wrapFence(insertText, detectLang(insertText, html));
        }

        applyInsert(textarea, insertText, selectionStart, selectionEnd, {
          attemptSplitFences: true,
        });
      } catch {
        // フォールバック: plain を優先。無ければ HTML をテキスト化して挿入
        const fallbackText = plain || htmlToPlainText(html);
        const insertText =
          looksLikeHtmlBlockCandidate(fallbackText) && !/```|~~~/.test(fallbackText)
            ? wrapFence(fallbackText, detectLang(fallbackText, html))
            : fallbackText;

        applyInsert(textarea, insertText, selectionStart, selectionEnd, {
          attemptSplitFences: true,
        });
      }
      return;
    }

    // 3) text/plain のみ → コードフェンスチェック（``` / ~~~）
    if (plain && /```|~~~/.test(plain) && onReplaceWithBlocks) {
      e.preventDefault();
      applyInsert(textarea, plain, selectionStart, selectionEnd, {
        attemptSplitFences: true,
      });
      return;
    }

    // それ以外 → ブラウザのデフォルト動作に委ねる
  };

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      className={cn('bg-transparent px-0 py-0', !isMarkdownEmpty && 'border-0')}
      contentClassName="px-0"
      label="Markdown"
      icon={NotebookPenIcon}
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
            'markdownBlockPreview bg-transparent border-0 rounded-lg overflow-visible cursor-text',
            'p-0'
          )}
          data-testid="markdown-preview"
          tabIndex={0}
          role="button"
          aria-label="Markdownを編集"
          onClick={() => setIsEditorOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            setIsEditorOpen(true);
          }}
        >
          {isMarkdownEmpty ? (
            <div
              className={cn(TEXT_BLOCK_CONTENT_CLASS, 'min-h-[24px] text-slate-300')}
              style={{ transform: 'translateY(2px)' }}
            >
              Markdownを入力...
            </div>
          ) : (
            <div style={{ transform: 'translateY(2px)' }}>
              <MarkdownBlockView md={markdown} className="markdownBlockCardView" />
            </div>
          )}
        </div>

        <MarkdownEditorDialog
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          value={markdown}
          onChange={handleChange}
          onPasteCapture={handlePaste}
          accentColor={accentColor}
          error={error}
        />
      </div>
    </BlockWrapper>
  );
};

/**
 * Markdown文字列をコードフェンスで分割し、
 * markdown / code ブロックの配列を返す。
 *
 * 重要:
 * - Markdownのインデント（ネストリスト等）を壊さないため、pushする本文は trim() しない
 * - 空判定だけ trim() を使う
 * - 改行は \n / \r\n 両方を扱う
 * - インデント付きフェンス（リスト内の ```）に対応（CommonMark: 先頭0〜3スペース）
 * - ``` と ~~~ の両対応
 * - unclosed fence は分割しない（1つの markdown ブロックとして返す）
 */
function parseAndSplitFences(md: string): EditorBlock[] {
  const normalizedMd = md.replace(/\r\n/g, '\n');
  const lines = normalizedMd.split('\n');

  const out: EditorBlock[] = [];
  let markdownBuf: string[] = [];

  let insideFence = false;
  let fenceIndent = '';
  let markerChar: '`' | '~' | null = null;
  let markerLen = 0;
  let lang = '';
  let codeBuf: string[] = [];

  const openRe = /^( {0,3})(`{3,}|~{3,})([^\n]*)$/;

  const flushMarkdown = () => {
    const text = markdownBuf.join('\n').replace(/\n{3,}$/g, '\n\n');
    if (text.trim().length > 0) {
      out.push({ type: 'markdown', markdown: text });
    }
    markdownBuf = [];
  };

  for (const line of lines) {
    if (!insideFence) {
      const m = line.match(openRe);
      if (!m) {
        markdownBuf.push(line);
        continue;
      }

      const indent = m[1] ?? '';
      const marker = m[2] ?? '';
      const infoRaw = (m[3] ?? '').trim();
      const ch = marker[0] as '`' | '~';

      // CommonMark: backtick fence の info string に backtick は不可
      if (ch === '`' && infoRaw.includes('`')) {
        markdownBuf.push(line);
        continue;
      }

      flushMarkdown();
      insideFence = true;
      fenceIndent = indent;
      markerChar = ch;
      markerLen = marker.length;
      lang = infoRaw.split(/\s+/)[0] ?? '';
      codeBuf = [];
      continue;
    }

    // closing fence: up to 3 spaces + same marker repeated >= opening length + trailing spaces only
    const closeRe = new RegExp(`^ {0,3}${markerChar}{${markerLen},}[ \\t]*$`);
    if (markerChar && closeRe.test(line)) {
      const raw = codeBuf.join('\n');
      const dedented =
        fenceIndent.length > 0
          ? raw
              .split('\n')
              .map((l) => (l.startsWith(fenceIndent) ? l.slice(fenceIndent.length) : l))
              .join('\n')
          : raw;

      out.push({
        type: 'code',
        code: { language: lang || 'text', code: dedented.replace(/\n+$/, '') },
      });

      insideFence = false;
      fenceIndent = '';
      markerChar = null;
      markerLen = 0;
      lang = '';
      codeBuf = [];
      continue;
    }

    codeBuf.push(line);
  }

  // unclosed fence は分割しない
  if (insideFence) {
    return [{ type: 'markdown', markdown: normalizedMd }];
  }

  flushMarkdown();

  if (out.length === 0) {
    out.push({ type: 'markdown', markdown: '' });
  }

  return out;
}