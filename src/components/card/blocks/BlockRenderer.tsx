import { CARD_ROW_PX } from "@/components/card/common/constants";
import {
    getNormalizedGridOffsetRows,
    getRowOffsetPx,
    getRowOffsetStyle,
    isGridOffsetType,
    isRowPositionableType,
} from "@/components/card/frame/rowOffset";
import { AudioPlayer } from "@/components/card/media/CardMedia";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import type { CardBlock } from "@/types";
import { useCallback, useMemo, useState } from "react";
import { CodeRenderer } from "./CodeRenderer";
import { ImageBlockContent } from "./ImageBlockContent";
import { MarkdownBlockView } from "./MarkdownBlockPreview";
import { MathBlockContent } from "./MathBlockContent";
import { TextBlockContent } from "./TextBlockContent";

interface BlockRendererProps {
  blocks?: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
}

/** 閲覧時の question ブロック。tap_to_reveal では答えをぼかして隠す。 */
function QuestionBlockView({
  block,
  displayMode,
}: {
  block: CardBlock;
  displayMode: "always" | "tap_to_reveal";
}) {
  const [revealed, setRevealed] = useState(displayMode === "always");

  return (
    <div
      className="rounded-r-md border-l-2 border-amber-400 bg-amber-50 pl-3 pr-2 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Q */}
      <div className="flex items-start gap-1.5 mb-2">
        <span className="shrink-0 text-[11px] font-bold text-amber-500 leading-none mt-[3px]">Q.</span>
        <p className="flex-1 text-sm font-medium text-slate-700 leading-snug whitespace-pre-wrap">
          {block.questionTitle || ""}
        </p>
      </div>

      {/* A */}
      <div
        className="flex items-start gap-1.5 border-t border-amber-200/60 pt-1.5"
        onClick={(e) => {
          e.stopPropagation();
          if (!revealed) setRevealed(true);
        }}
        style={{ cursor: revealed ? "default" : "pointer" }}
      >
        <span className="shrink-0 text-[11px] font-bold text-slate-400 leading-none mt-[3px]">A.</span>
        <div className="flex-1 relative">
          <p
            className="text-sm text-slate-600 leading-snug whitespace-pre-wrap transition-all duration-200"
            style={
              revealed
                ? undefined
                : { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }
            }
          >
            {block.questionAnswer || "\u00a0"}
          </p>
          {!revealed && (
            <span className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400">
              タップして表示
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function BlockRenderer({
  blocks,
  onGalleryFullscreenChange,
}: BlockRendererProps) {
  const { settings } = useUserSettings();
  const questionDisplayMode = settings?.questionDisplayMode ?? "tap_to_reveal";
  const toMediaUrl = useCallback((item: unknown) => {
    if (typeof item === "string") return item;
    if (!item || typeof item !== "object") return null;
    const candidate = item as {
      remoteUrl?: string;
      localUrl?: string;
      url?: string;
    };
    return candidate.remoteUrl ?? candidate.localUrl ?? candidate.url ?? null;
  }, []);

  const isRenderableBlock = useCallback((block: CardBlock) => {
    if (block.type === "text") return (block.content ?? "").trim() !== "";
    if (block.type === "question")
      return (block.questionTitle ?? "").trim() !== "" || (block.questionAnswer ?? "").trim() !== "";
    if (block.type === "code") return (block.code?.code ?? "").trim() !== "";
    if (block.type === "image") return (block.images?.length ?? 0) > 0;
    if (block.type === "audio") return (block.audios?.length ?? 0) > 0;
    if (block.type === "math") return (block.math?.latex ?? "").trim() !== "";
    if (block.type === "markdown") return (block.markdown ?? "").trim() !== "";
    return false;
  }, []);

  const renderableBlocks = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    return blocks.filter(isRenderableBlock);
  }, [blocks, isRenderableBlock]);

  if (!renderableBlocks || renderableBlocks.length === 0) return null;

  return (
    <div className="w-full max-w-full">
      {renderableBlocks.map((block) => {
        const isGridOffsetBlock = isGridOffsetType(block.type);
        const isLinePositionable =
          isRowPositionableType(block.type) && !isGridOffsetBlock;
        const rowOffsetPx = isLinePositionable ? getRowOffsetPx(block) : 0;
        const offsetStyle = isLinePositionable
          ? getRowOffsetStyle(block)
          : undefined;
        const gridOffsetRows = isGridOffsetBlock
          ? getNormalizedGridOffsetRows(block)
          : 0;
        const gridOffsetPx = gridOffsetRows * CARD_ROW_PX;

        return (
          <div
            key={block.id}
            className="w-full min-w-0 max-w-full flow-root"
            data-block-row="true"
            data-row-offset-applied={rowOffsetPx ? "true" : undefined}
            style={offsetStyle}
          >
            {block.type === "question" && (
              <QuestionBlockView
                block={block}
                displayMode={questionDisplayMode}
              />
            )}

            {block.type === "text" && (block.content ?? "").trim() !== "" && (
              <div className="w-full max-w-full overflow-hidden">
                <TextBlockContent
                  mode="view"
                  content={String(block.content ?? "")}
                />
              </div>
            )}

            {block.type === "code" &&
              (block.code?.code ?? "").trim() !== "" && (
                <div className="w-full max-w-full overflow-visible">
                  {gridOffsetPx > 0 && (
                    <div
                      aria-hidden
                      className="pointer-events-none"
                      style={{ height: `${gridOffsetPx}px` }}
                    />
                  )}
                  <CodeRenderer
                    code={block.code!.code}
                    language={block.code!.language}
                  />
                </div>
              )}

            {block.type === "image" && (block.images?.length ?? 0) > 0 && (
              <div className="py-[4px]">
                <ImageBlockContent
                  mode="view"
                  urls={(block.images ?? [])
                    .map(toMediaUrl)
                    .filter((u): u is string => Boolean(u))}
                  items={block.images ?? []}
                  onFullscreenChange={onGalleryFullscreenChange}
                />
              </div>
            )}

            {block.type === "audio" && (block.audios?.length ?? 0) > 0 && (
              <div className="flex justify-center">
                <AudioPlayer
                  urls={(block.audios ?? [])
                    .map(toMediaUrl)
                    .filter((u): u is string => Boolean(u))}
                />
              </div>
            )}

            {block.type === "math" &&
              (block.math?.latex ?? "").trim() !== "" && (
                <div className="w-full max-w-full overflow-visible">
                  {gridOffsetPx > 0 && (
                    <div
                      aria-hidden
                      className="pointer-events-none"
                      style={{ height: `${gridOffsetPx}px` }}
                    />
                  )}
                  <MathBlockContent
                    latex={block.math!.latex || ""}
                    displayMode={block.math!.displayMode || "block"}
                  />
                </div>
              )}

            {block.type === "markdown" &&
              (block.markdown ?? "").trim() !== "" && (
                <MarkdownBlockView
                  md={block.markdown!}
                  className="markdownBlockCardView"
                  bleedX={false}
                />
              )}
          </div>
        );
      })}
    </div>
  );
}




