import React, { useMemo, useState } from 'react';
import NotebookPenIcon from 'lucide-react/dist/esm/icons/notebook-pen';
import { BlockWrapper } from './BlockWrapper';
import { MarkdownBlockPreview } from './MarkdownBlockPreview';
import { MarkdownEditorDialog } from './MarkdownEditorDialog';
import { cn } from '@/lib/utils';

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
  onReplaceWithBlocks?: (
    blocks: Array<
      | { type: 'markdown'; markdown: string }
      | { type: 'code'; code: { language: string; code: string } }
    >
  ) => void;
}

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
  const PREVIEW_LINES = 6;
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const normalizeMarkdownForEditor = (input: string) =>
    String(input ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}$/g, '\n\n');

  const handleChange = (value: string) => {
    const MAX_LENGTH = 50000;
    if (value.length > MAX_LENGTH) {
      setError('Markdown文字列が長すぎます（最大50,000文字）');
      return;
    }
    setError(null);
    onChange(value);
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
        const mdRaw = sanitizeAndConvertToMarkdown(html);
        const md = normalizeMarkdownForEditor(
          mdRaw && mdRaw.trim().length > 0 ? mdRaw : plain
        );

        // 既存内容 + ペーストを合わせてフェンス分離（必要なら）
        const existingBefore = markdown.slice(0, selectionStart);
        const existingAfter = markdown.slice(selectionEnd);
        const merged = existingBefore + md + existingAfter;

        if (onReplaceWithBlocks) {
          const blocks = parseAndSplitFences(merged);
          if (blocks.length > 1) {
            onReplaceWithBlocks(blocks);
            return;
          }
        }

        // 分離不要なら通常挿入（state更新 + カーソル復元）
        handleChange(merged);
        const nextCaret = selectionStart + md.length;
        requestAnimationFrame(() => {
          try {
            textarea.focus();
            textarea.setSelectionRange(nextCaret, nextCaret);
          } catch (error) {
            void error;
          }
        });
      } catch {
        // フォールバック: plaintext で挿入
        const fallback = normalizeMarkdownForEditor(plain || html);
        const merged = markdown.slice(0, selectionStart) + fallback + markdown.slice(selectionEnd);
        handleChange(merged);
        const nextCaret = selectionStart + fallback.length;
        requestAnimationFrame(() => {
          try {
            textarea.focus();
            textarea.setSelectionRange(nextCaret, nextCaret);
          } catch (error) {
            void error;
          }
        });
      }
      return;
    }

    // text/plain のみ → コードフェンスチェック
    if (plain && plain.includes('```') && onReplaceWithBlocks) {
      e.preventDefault();
      const existingBefore = markdown.slice(0, selectionStart);
      const existingAfter = markdown.slice(selectionEnd);
      const merged = existingBefore + normalizeMarkdownForEditor(plain) + existingAfter;
      const blocks = parseAndSplitFences(merged);
      if (blocks.length > 1) {
        onReplaceWithBlocks(blocks);
        return;
      }
      // 分離不要なら通常挿入（state更新 + カーソル復元）
      handleChange(merged);
      const nextCaret = selectionStart + plain.length;
      requestAnimationFrame(() => {
        try {
          textarea.focus();
          textarea.setSelectionRange(nextCaret, nextCaret);
        } catch (error) {
          void error;
        }
      });
      return;
    }

    // それ以外 → ブラウザのデフォルト動作に委ねる
  };

  const previewNode = useMemo(
    () => (
      <MarkdownBlockPreview
        markdown={markdown}
        className="font-serif text-base font-medium leading-[24px]"
      />
    ),
    [markdown]
  );

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      className="bg-transparent border-transparent py-0"
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
      <div className="markdownBlockRoot px-0 py-0">
        <div
          className={cn(
            'markdownBlockPreviewFrame markdownBlockPreview bg-transparent border-0 rounded-lg p-0 overflow-visible',
            'cursor-text'
          )}
          data-testid="markdown-preview"
          style={{ ['--md-lines' as any]: 6 } as React.CSSProperties}
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
          <div className="markdownBlockPreviewContent px-3">
            {previewNode}
          </div>
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
 * Markdown文字列をコードフェンス(```)で分割し、
 * markdown / code ブロックの配列を返す。
 *
 * 重要:
 * - Markdownのインデント（ネストリスト等）を壊さないため、pushする本文は trim() しない
 * - 空判定だけ trim() を使う
 * - 改行は \n / \r\n 両方を扱う
 */
function parseAndSplitFences(
  md: string
): Array<
  | { type: 'markdown'; markdown: string }
  | { type: 'code'; code: { language: string; code: string } }
> {
  const normalizeChunk = (text: string) =>
    text
      .replace(/\r\n/g, '\n')
      .replace(/^\n+/, '')
      .replace(/\n{3,}$/g, '\n\n');

  // fence line pattern: ``` + language(optional) の行
  const fenceRegex = /^```([a-zA-Z0-9_-]*)\s*$/gm;

  const result: Array<
    | { type: 'markdown'; markdown: string }
    | { type: 'code'; code: { language: string; code: string } }
  > = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  let insideFence = false;
  let fenceLang = '';
  let fenceStart = 0;

  fenceRegex.lastIndex = 0;

  while ((match = fenceRegex.exec(md)) !== null) {
    const fenceLineStart = match.index;
    const fenceLineText = match[0];
    const fenceLineEnd = fenceLineStart + fenceLineText.length;

    // fence行末の改行（\n または \r\n）を含めて次の開始位置を決める
    let nextIndex = fenceLineEnd;
    if (md[nextIndex] === '\r' && md[nextIndex + 1] === '\n') nextIndex += 2;
    else if (md[nextIndex] === '\n') nextIndex += 1;

    if (!insideFence) {
      // フェンス開始前の markdown
      const textBefore = normalizeChunk(md.slice(lastIndex, fenceLineStart));
      if (textBefore.trim().length > 0) {
        result.push({ type: 'markdown', markdown: textBefore });
      }

      insideFence = true;
      fenceLang = match[1] || '';
      fenceStart = nextIndex; // フェンス行の次からコード開始
    } else {
      // フェンス終了 → コード取り出し
      const codeContent = md.slice(fenceStart, fenceLineStart);
      // 末尾の空行をすべて落とす（内容末尾のインデントは保持）
      const code = codeContent.replace(/(?:\r?\n)+$/, '');

      result.push({
        type: 'code',
        code: { language: fenceLang || 'text', code },
      });

      insideFence = false;
      fenceLang = '';
      lastIndex = nextIndex;
    }
  }

  // 残り
  const remaining = normalizeChunk(md.slice(lastIndex));
  if (remaining.trim().length > 0) {
    if (insideFence) {
      // 閉じられていないフェンス → そのまま markdown として戻す
      const reconstructed =
        '```' + fenceLang + '\n' + normalizeChunk(md.slice(fenceStart));
      result.push({ type: 'markdown', markdown: reconstructed });
    } else {
      result.push({ type: 'markdown', markdown: remaining });
    }
  }

  if (result.length === 0) {
    result.push({ type: 'markdown', markdown: '' });
  }

  return result;
}