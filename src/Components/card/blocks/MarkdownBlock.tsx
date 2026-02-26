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
   * ペースト処理：
   * 1. text/html があれば sanitize → turndown でMarkdown化
   * 2. text/plain しかなければそのまま
   * 3. コードフェンスがあれば分離してコールバック
   */
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    const html = clipboardData.getData('text/html');
    const plain = clipboardData.getData('text/plain');
    const textarea = e.currentTarget;
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? 0;

    // HTML がある場合 → sanitize → Markdown 変換
    if (html && html.trim()) {
      e.preventDefault();
      try {
        const { sanitizeAndConvertToMarkdown } = await import('@/utils/markdownPaste');
        const mdRaw = await sanitizeAndConvertToMarkdown(html);

        // 変換結果が空っぽなら plain にフォールバック（plain が無ければ HTML をテキスト化）
        const fallbackText = plain || htmlToPlainText(html);
        const insertText =
          mdRaw && mdRaw.trim().length > 0 ? mdRaw : fallbackText;

        applyInsert(textarea, insertText, selectionStart, selectionEnd, {
          attemptSplitFences: true,
        });
      } catch {
        // フォールバック: plain を優先。無ければ HTML をテキスト化して挿入
        const fallbackText = plain || htmlToPlainText(html);
        applyInsert(textarea, fallbackText, selectionStart, selectionEnd, {
          attemptSplitFences: true,
        });
      }
      return;
    }

    // text/plain のみ → コードフェンスチェック（``` / ~~~）
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
