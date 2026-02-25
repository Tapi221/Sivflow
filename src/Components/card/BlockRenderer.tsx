import React from 'react';
import type { CardBlock } from '@/types';
import { CodeRenderer } from './CodeRenderer';
import { AudioPlayer, ImageGallery } from './CardMedia';
import { MathRenderer } from './blocks/MathRenderer';
import { MarkdownBlockView } from './blocks/MarkdownBlockPreview';
import { CARD_ROW_PX } from './constants';

interface BlockRendererProps {
  blocks?: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
}

const ROW_STEP_PX = CARD_ROW_PX;

const renderMultilineText = (text: string) => {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  return (
    <div
      className="w-full min-h-[24px] px-1.5 py-0 text-center text-base font-medium text-slate-700 font-serif"
      style={{ lineHeight: '24px' }}
    >
      {lines.map((line, lineIndex) => (
        <div
          key={`line-${lineIndex}`}
          className="whitespace-pre-wrap break-words leading-[24px]"
          style={{ overflowWrap: 'anywhere' }}
        >
          {line === '' ? '\u00A0' : line}
        </div>
      ))}
    </div>
  );
};

export function BlockRenderer({
  blocks,
  onGalleryFullscreenChange,
}: BlockRendererProps) {
  if (!blocks || blocks.length === 0) return null;

  const getRowOffset = (block: CardBlock) => {
    const n = Number(block.rowOffset ?? 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(-999, Math.min(999, Math.round(n)));
  };

  const toMediaUrl = (item: unknown) => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return null;
    const candidate = item as { remoteUrl?: string; localUrl?: string; url?: string };
    return candidate.remoteUrl ?? candidate.localUrl ?? candidate.url ?? null;
  };

  const isRenderableBlock = (block: CardBlock) => {
    if (block.type === 'text') return (block.content ?? '').trim() !== '';
    if (block.type === 'code') return (block.code?.code ?? '').trim() !== '';
    if (block.type === 'image') return (block.images?.length ?? 0) > 0;
    if (block.type === 'audio') return (block.audios?.length ?? 0) > 0;
    if (block.type === 'math') return (block.math?.latex ?? '').trim() !== '';
    if (block.type === 'markdown') return (block.markdown ?? '').trim() !== '';
    return false;
  };

  const renderableBlocks = blocks.filter(isRenderableBlock);
  if (renderableBlocks.length === 0) return null;

  return (
    <div className="space-y-0 w-full max-w-full">
      {renderableBlocks.map((block) => {
        const isLinePositionable = block.type === 'text' || block.type === 'code';
        const rowOffsetPx = isLinePositionable ? getRowOffset(block) * ROW_STEP_PX : 0;
        const offsetStyle = rowOffsetPx ? { marginTop: rowOffsetPx } : undefined;

        return (
          <div
            key={block.id}
            className="w-full min-w-0 max-w-full"
            data-block-row="true"
            data-row-offset-applied={rowOffsetPx ? 'true' : undefined}
            style={offsetStyle}
          >
            {block.type === 'text' && (block.content ?? '').trim() !== '' && (
              <div className="w-full max-w-full overflow-hidden">
                {renderMultilineText(String(block.content ?? ''))}
              </div>
            )}

            {block.type === 'code' && (block.code?.code ?? '').trim() !== '' && (
              <div className="w-full max-w-full overflow-hidden">
                <CodeRenderer code={block.code!.code} language={block.code!.language} />
              </div>
            )}

            {block.type === 'image' && (block.images?.length ?? 0) > 0 && (
              <ImageGallery
                urls={(block.images ?? []).map(toMediaUrl).filter((u): u is string => Boolean(u))}
                onFullscreenChange={onGalleryFullscreenChange}
              />
            )}

            {block.type === 'audio' && (block.audios?.length ?? 0) > 0 && (
              <div className="flex justify-center">
                <AudioPlayer urls={(block.audios ?? []).map(toMediaUrl).filter((u): u is string => Boolean(u))} />
              </div>
            )}

            {block.type === 'math' && (block.math?.latex ?? '').trim() !== '' && (
              <div className="py-2 flex justify-center">
                <MathRenderer
                  latex={block.math!.latex || ''}
                  displayMode={block.math!.displayMode || 'block'}
                  className="text-slate-800"
                />
              </div>
            )}

            {block.type === 'markdown' && (block.markdown ?? '').trim() !== '' && (
              <div className="markdownBlockSurface w-full max-w-full bg-transparent overflow-visible">
                <div className="w-full max-w-full px-1.5 py-0">
                  <MarkdownBlockView md={block.markdown!} className="markdownBlockCardView" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
