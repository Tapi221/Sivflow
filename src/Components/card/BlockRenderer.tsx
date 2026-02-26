import { useMemo, useCallback } from 'react';
import type { CardBlock } from '@/types';
import { CodeRenderer } from './CodeRenderer';
import { AudioPlayer } from './CardMedia';
import { ImageBlockContent } from './blocks/ImageBlockContent';
import { MathBlockContent } from './blocks/MathBlockContent';
import { MarkdownBlockView } from './blocks/MarkdownBlockPreview';
import { TextBlockContent } from './blocks/TextBlockContent';
import {
  getNormalizedGridOffsetRows,
  getRowOffsetPx,
  getRowOffsetStyle,
  isGridOffsetType,
  isRowPositionableType,
} from './rowOffset';
import { CARD_ROW_PX } from './constants';

interface BlockRendererProps {
  blocks?: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
}

export function BlockRenderer({ blocks, onGalleryFullscreenChange }: BlockRendererProps) {
  const toMediaUrl = useCallback((item: unknown) => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return null;
    const candidate = item as { remoteUrl?: string; localUrl?: string; url?: string };
    return candidate.remoteUrl ?? candidate.localUrl ?? candidate.url ?? null;
  }, []);

  const isRenderableBlock = useCallback((block: CardBlock) => {
    if (block.type === 'text') return (block.content ?? '').trim() !== '';
    if (block.type === 'code') return (block.code?.code ?? '').trim() !== '';
    if (block.type === 'image') return (block.images?.length ?? 0) > 0;
    if (block.type === 'audio') return (block.audios?.length ?? 0) > 0;
    if (block.type === 'math') return (block.math?.latex ?? '').trim() !== '';
    if (block.type === 'markdown') return (block.markdown ?? '').trim() !== '';
    return false;
  }, []);

  const renderableBlocks = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    return blocks.filter(isRenderableBlock);
  }, [blocks, isRenderableBlock]);

  if (!renderableBlocks || renderableBlocks.length === 0) return null;

  return (
    <div className="w-full max-w-full space-y-0">
      {renderableBlocks.map((block) => {
        const isGridOffsetBlock = isGridOffsetType(block.type);
        const isLinePositionable = isRowPositionableType(block.type) && !isGridOffsetBlock;
        const rowOffsetPx = isLinePositionable ? getRowOffsetPx(block) : 0;
        const offsetStyle = isLinePositionable ? getRowOffsetStyle(block) : undefined;
        const gridOffsetRows = isGridOffsetBlock ? getNormalizedGridOffsetRows(block) : 0;
        const gridOffsetPx = gridOffsetRows * CARD_ROW_PX;

        return (
          <div
            key={block.id}
            className="w-full min-w-0 max-w-full flow-root"
            data-block-row="true"
            data-row-offset-applied={rowOffsetPx ? 'true' : undefined}
            style={offsetStyle}
          >
            {block.type === 'text' && (block.content ?? '').trim() !== '' && (
              <div className="w-full max-w-full overflow-hidden">
                <TextBlockContent mode="view" content={String(block.content ?? '')} />
              </div>
            )}

            {block.type === 'code' && (block.code?.code ?? '').trim() !== '' && (
              <div className="w-full max-w-full overflow-visible">
                {gridOffsetPx > 0 && (
                  <div
                    aria-hidden
                    className="pointer-events-none"
                    style={{ height: `${gridOffsetPx}px` }}
                  />
                )}
                <CodeRenderer code={block.code!.code} language={block.code!.language} />
              </div>
            )}

            {block.type === 'image' && (block.images?.length ?? 0) > 0 && (
              <ImageBlockContent
                mode="view"
                urls={(block.images ?? []).map(toMediaUrl).filter((u): u is string => Boolean(u))}
                items={(block.images ?? []) as any[]}
                onFullscreenChange={onGalleryFullscreenChange}
              />
            )}

            {block.type === 'audio' && (block.audios?.length ?? 0) > 0 && (
              <div className="flex justify-center">
                <AudioPlayer
                  urls={(block.audios ?? []).map(toMediaUrl).filter((u): u is string => Boolean(u))}
                />
              </div>
            )}

            {block.type === 'math' && (block.math?.latex ?? '').trim() !== '' && (
              <div className="w-full max-w-full overflow-visible">
                {gridOffsetPx > 0 && (
                  <div
                    aria-hidden
                    className="pointer-events-none"
                    style={{ height: `${gridOffsetPx}px` }}
                  />
                )}
                <MathBlockContent
                  latex={block.math!.latex || ''}
                  displayMode={block.math!.displayMode || 'block'}
                />
              </div>
            )}

            {block.type === 'markdown' && (block.markdown ?? '').trim() !== '' && (
              <MarkdownBlockView md={block.markdown!} className="markdownBlockCardView" />
            )}
          </div>
        );
      })}
    </div>
  );
}
