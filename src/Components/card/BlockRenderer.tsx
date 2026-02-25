import { useMemo, useCallback } from 'react';
import type { CardBlock } from '@/types';
import { CodeRenderer } from './CodeRenderer';
import { AudioPlayer } from './CardMedia';
import { ImageBlockContent } from './blocks/ImageBlockContent';
import { MathBlockContent } from './blocks/MathBlockContent';
import { MarkdownBlockContent } from './blocks/MarkdownBlockContent';
import { TextBlockContent } from './blocks/TextBlockContent';
import { CARD_ROW_PX } from './constants';

interface BlockRendererProps {
  blocks?: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
}

const ROW_STEP_PX = CARD_ROW_PX;

export function BlockRenderer({ blocks, onGalleryFullscreenChange }: BlockRendererProps) {
  const getRowOffset = useCallback((block: CardBlock) => {
    const n = Number(block.rowOffset ?? 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(-999, Math.min(999, Math.round(n)));
  }, []);

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
        const isLinePositionable = block.type === 'text' || block.type === 'code';
        const rowOffsetPx = isLinePositionable ? getRowOffset(block) * ROW_STEP_PX : 0;

        // marginTop を使う前提で、margin-collapsing を確実に潰すため flow-root を入れる
        // (親子/兄弟マージン相殺で突然ズレる事故を防ぐ)
        const offsetStyle = rowOffsetPx ? { marginTop: rowOffsetPx } : undefined;

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
              <div className="w-full max-w-full overflow-hidden">
                <CodeRenderer code={block.code!.code} language={block.code!.language} />
              </div>
            )}

            {block.type === 'image' && (block.images?.length ?? 0) > 0 && (
              <ImageBlockContent
                mode="view"
                urls={(block.images ?? []).map(toMediaUrl).filter((u): u is string => Boolean(u))}
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
              <div className="py-2 flex justify-center">
                <MathBlockContent
                  latex={block.math!.latex || ''}
                  displayMode={block.math!.displayMode || 'block'}
                />
              </div>
            )}

            {block.type === 'markdown' && (block.markdown ?? '').trim() !== '' && (
              <div className="markdownBlockSurface w-full max-w-full bg-transparent overflow-visible">
                <div className="w-full max-w-full px-1.5 py-0">
                  <MarkdownBlockContent markdown={block.markdown!} className="markdownBlockCardView" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
