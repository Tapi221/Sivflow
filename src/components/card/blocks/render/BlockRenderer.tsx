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
import type { CardBlock } from "@/types/domain/card";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import { BlockSeparator } from "@/components/card/blocks/core/BlockSeparator";
import { BlockFrame } from "@/components/card/blocks/core/BlockFrame";
import { shouldRenderInterBlockSeparator } from "@/components/card/blocks/core/blockDisplayPolicy";
import { CodeRenderer } from "@/components/card/blocks/code/CodeRenderer";
import { ImageBlockContent } from "@/components/card/blocks/image/ImageBlockContent";
import { ImageBlockShell } from "@/components/card/blocks/image/ImageBlockShell";
import { MarkdownBlockView } from "@/components/card/blocks/markdown/MarkdownBlockPreview";
import { MathBlockPreviewPane } from "@/components/card/blocks/math/MathBlockPreviewPane";
import { QuestionBlockLayout } from "@/components/card/blocks/question/QuestionBlockLayout";
import {
  QUESTION_BLOCK_ANSWER_TEXT_CLASS,
  QUESTION_BLOCK_TITLE_TEXT_CLASS,
} from "@/components/card/blocks/question/questionBlockTextStyles";
import { TextBlockContent } from "@/components/card/blocks/text/TextBlockContent";

interface BlockRendererProps {
  blocks?: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
  displayMode?: "fixed" | "fluid";
  zoom?: number;
}

type BlockFrameConfig = {
  className?: string;
  contentClassName?: string;
};

const getFluidZoomStyle = (
  displayMode: "fixed" | "fluid",
  zoom: number,
): CSSProperties | undefined => {
  if (displayMode !== "fluid") return undefined;
  const safeZoom =
    typeof zoom === "number" && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  if (Math.abs(safeZoom - 1) < 0.001) return undefined;
  return { fontSize: `${safeZoom}em` };
};

const getBlockFrameConfig = (blockType: CardBlock["type"]): BlockFrameConfig => {
  if (blockType === "text" || blockType === "markdown" || blockType === "question") {
    return {
      className: "bg-transparent px-0 py-0",
      contentClassName: "px-0",
    };
  }

  if (blockType === "code") {
    return {
      className: "bg-transparent px-0 py-0",
      contentClassName: "relative px-0",
    };
  }

  if (blockType === "image") {
    return {
      className: "py-0 px-0",
      contentClassName: "px-0",
    };
  }

  return {};
};

const QuestionBlockView = ({
  block,
  displayMode,
}: {
  block: CardBlock;
  displayMode: "always" | "tap_to_reveal";
}) => {
  const [revealed, setRevealed] = useState(displayMode === "always");

  return (
    <QuestionBlockLayout
      containerProps={{
        onClick: (e) => e.stopPropagation(),
      }}
      questionContent={
        <p className={`flex-1 ${QUESTION_BLOCK_TITLE_TEXT_CLASS}`}>
          {block.questionTitle || ""}
        </p>
      }
      answerContent={
        <p
          className={`${QUESTION_BLOCK_ANSWER_TEXT_CLASS} transition-all duration-200`}
          style={
            revealed
              ? undefined
              : {
                  filter: "blur(5px)",
                  userSelect: "none",
                  pointerEvents: "none",
                }
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
};

const renderBlock = (
  block: CardBlock,
  options: {
    questionDisplayMode: "always" | "tap_to_reveal";
    gridOffsetPx: number;
    onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
    toMediaUrl: (item: unknown) => string | null;
    displayMode: "fixed" | "fluid";
    zoom: number;
  },
) => {
  const {
    questionDisplayMode,
    gridOffsetPx,
    onGalleryFullscreenChange,
    toMediaUrl,
    displayMode,
    zoom,
  } = options;

  switch (block.type) {
    case "question":
      if (
        (block.questionTitle ?? "").trim() === "" &&
        (block.questionAnswer ?? "").trim() === ""
      ) {
        return null;
      }

      return (
        <QuestionBlockView block={block} displayMode={questionDisplayMode} />
      );

    case "text":
      if ((block.content ?? "").trim() === "") return null;

      return (
        <div
          className="w-full max-w-full overflow-hidden"
          style={getFluidZoomStyle(displayMode, zoom)}
        >
          <TextBlockContent mode="view" content={String(block.content ?? "")} />
        </div>
      );

    case "code":
      if ((block.code?.code ?? "").trim() === "") return null;

      return (
        <div
          className="w-full max-w-full overflow-visible"
          style={getFluidZoomStyle(displayMode, zoom)}
        >
          {gridOffsetPx > 0 && (
            <div
              aria-hidden
              className="pointer-events-none"
              style={{ height: `${gridOffsetPx}px` }}
            />
          )}
          <CodeRenderer code={block.code.code} language={block.code.language} />
        </div>
      );

    case "image":
      if ((block.images?.length ?? 0) === 0) return null;

      return (
        <ImageBlockShell showBorderOverlay>
          <ImageBlockContent
            mode="view"
            urls={(block.images ?? [])
              .map(toMediaUrl)
              .filter((u): u is string => Boolean(u))}
            items={block.images ?? []}
            onFullscreenChange={onGalleryFullscreenChange}
            displayMode={displayMode}
            zoom={zoom}
          />
        </ImageBlockShell>
      );

    case "audio":
      if ((block.audios?.length ?? 0) === 0) return null;

      return (
        <div className="flex justify-center">
          <AudioPlayer
            urls={(block.audios ?? [])
              .map(toMediaUrl)
              .filter((u): u is string => Boolean(u))}
          />
        </div>
      );

    case "math":
      if ((block.math?.latex ?? "").trim() === "") return null;

      return (
        <div
          className="w-full max-w-full overflow-visible"
          style={getFluidZoomStyle(displayMode, zoom)}
        >
          {gridOffsetPx > 0 && (
            <div
              aria-hidden
              className="pointer-events-none"
              style={{ height: `${gridOffsetPx}px` }}
            />
          )}
          <div className="space-y-1.5 px-2 py-0.5">
            <MathBlockPreviewPane
              latex={block.math.latex || ""}
              displayMode={block.math.displayMode || "block"}
              className="rounded-lg"
            />
          </div>
        </div>
      );

    case "markdown":
      if ((block.markdown ?? "").trim() === "") return null;

      return (
        <div className="px-0 py-0">
          <div className="markdownBlockPreview bg-transparent border-0 rounded-lg overflow-visible p-0">
            <MarkdownBlockView
              md={block.markdown}
              className="markdownBlockCardView"
              bleedX={false}
              style={getFluidZoomStyle(displayMode, zoom)}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};

export const BlockRenderer = ({
  blocks,
  onGalleryFullscreenChange,
  displayMode = "fixed",
  zoom = 1,
}: BlockRendererProps) => {
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
    if (block.type === "question") {
      return (
        (block.questionTitle ?? "").trim() !== "" ||
        (block.questionAnswer ?? "").trim() !== ""
      );
    }
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

  if (!renderableBlocks.length) return null;

  return (
    <div className="w-full max-w-full">
      {renderableBlocks.map((block, index) => {
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

        const showSeparator =
          index > 0 &&
          shouldRenderInterBlockSeparator(
            renderableBlocks[index - 1].type,
            block.type,
          );

        const content = renderBlock(block, {
          questionDisplayMode,
          gridOffsetPx,
          onGalleryFullscreenChange,
          toMediaUrl,
          displayMode,
          zoom,
        });

        if (!content) return null;

        const frameConfig = getBlockFrameConfig(block.type);

        return (
          <div key={block.id}>
            {showSeparator && <BlockSeparator />}

            <div
              className="w-full min-w-0 max-w-full flow-root"
              data-block-row="true"
              data-row-offset-applied={rowOffsetPx ? "true" : undefined}
              style={offsetStyle}
            >
              {block.type === "audio" ? (
                content
              ) : (
                <BlockFrame
                  variant="editor"
                  className={frameConfig.className}
                  contentClassName={frameConfig.contentClassName}
                >
                  {content}
                </BlockFrame>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
