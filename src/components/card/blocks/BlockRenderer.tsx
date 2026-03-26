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
import { ImageBlockShell } from "./ImageBlockShell";
import { MarkdownBlockView } from "./MarkdownBlockPreview";
import { MathBlockPreviewPane } from "./MathBlockPreviewPane";
import { QuestionBlockLayout } from "./QuestionBlockLayout";
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
    <QuestionBlockLayout
      containerProps={{
        onClick: (e) => e.stopPropagation(),
      }}
      questionContent={
        <p className="flex-1 text-xs font-medium text-slate-700 leading-snug whitespace-pre-wrap">
          {block.questionTitle || ""}
        </p>
      }
      answerContent={
        <p
          className="text-xs text-slate-600 leading-snug whitespace-pre-wrap transition-all duration-200"
          style={
            revealed
              ? undefined
              : { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }
          }
        >
          {block.questionAnswer || "\u00a0"}
        </p>
      }
      answerContainerProps={{
        onClick: (e) => {
          e.stopPropagation();
          if (!revealed) setRevealed(true);
        },
        style: { cursor: revealed ? "default" : "pointer" },
      }}
      answerOverlay={
        !revealed ? (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">
            タップして表示
          </span>
        ) : undefined
      }
    />
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

        const blockLayoutKind: "normal" | "special" =
          block.type === "code" || block.type === "question" ? "special" : "normal";

        return (
          <div
            key={block.id}
            className="w-full min-w-0 max-w-full flow-root"
            data-block-row="true"
            data-block-layout-kind={blockLayoutKind}
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
              <ImageBlockShell>
                <ImageBlockContent
                  mode="view"
                  urls={(block.images ?? [])
                    .map(toMediaUrl)
                    .filter((u): u is string => Boolean(u))}
                  items={block.images ?? []}
                  onFullscreenChange={onGalleryFullscreenChange}
                />
              </ImageBlockShell>
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
                  <MathBlockPreviewPane
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




