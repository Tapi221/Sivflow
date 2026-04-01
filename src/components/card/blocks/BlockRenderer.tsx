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
import { useCallback, useContext, useMemo, useState } from "react";
import { shouldRenderInterBlockSeparator } from "./blockDisplayPolicy";
import { BlockEditModeContext } from "./BlockWrapper";
import { CodeRenderer } from "./CodeRenderer";
import { ImageBlockContent } from "./ImageBlockContent";
import { ImageBlockShell } from "./ImageBlockShell";
import { MarkdownBlockView } from "./MarkdownBlockPreview";
import { MathBlockPreviewPane } from "./MathBlockPreviewPane";
import { QuestionBlockLayout } from "./QuestionBlockLayout";
import {
  QUESTION_BLOCK_ANSWER_TEXT_CLASS,
  QUESTION_BLOCK_TITLE_TEXT_CLASS,
} from "./questionBlockTextStyles";
import { TextBlockContent } from "./TextBlockContent";

interface BlockRendererProps {
  blocks?: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
}

/** Question表示 */
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
}

/** typeごとの描画 */
function renderBlock(
  block: CardBlock,
  options: {
    questionDisplayMode: "always" | "tap_to_reveal";
    gridOffsetPx: number;
    onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
    toMediaUrl: (item: unknown) => string | null;
  },
) {
  const {
    questionDisplayMode,
    gridOffsetPx,
    onGalleryFullscreenChange,
    toMediaUrl,
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
        <QuestionBlockView
          block={block}
          displayMode={questionDisplayMode}
        />
      );

    case "text":
      if ((block.content ?? "").trim() === "") return null;

      return (
        <div className="w-full max-w-full overflow-hidden">
          <TextBlockContent
            mode="view"
            content={String(block.content ?? "")}
          />
        </div>
      );

    case "code":
      if ((block.code?.code ?? "").trim() === "") return null;

      return (
        <div className="w-full max-w-full overflow-visible">
          {gridOffsetPx > 0 && (
            <div
              aria-hidden
              className="pointer-events-none"
              style={{ height: `${gridOffsetPx}px` }}
            />
          )}
          <CodeRenderer
            code={block.code.code}
            language={block.code.language}
          />
        </div>
      );

    case "image":
      if ((block.images?.length ?? 0) === 0) return null;

      return (
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
        <div className="w-full max-w-full overflow-visible">
          {gridOffsetPx > 0 && (
            <div
              aria-hidden
              className="pointer-events-none"
              style={{ height: `${gridOffsetPx}px` }}
            />
          )}
          <MathBlockPreviewPane
            latex={block.math.latex || ""}
            displayMode={block.math.displayMode || "block"}
          />
        </div>
      );

    case "markdown":
      if ((block.markdown ?? "").trim() === "") return null;

      return (
        <MarkdownBlockView
          md={block.markdown}
          className="markdownBlockCardView"
          bleedX={false}
        />
      );

    default:
      return null;
  }
}

export function BlockRenderer({
  blocks,
  onGalleryFullscreenChange,
}: BlockRendererProps) {
  const inEditMode = useContext(BlockEditModeContext);
  const blockOutline = inEditMode
    ? "inset 0 0 0 1px rgba(59, 130, 246, 0.35)"
    : undefined;

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
        });

        if (!content) return null;

        return (
          <div key={block.id}>
            {showSeparator && (
              <div className="my-1 h-px w-full bg-slate-200" />
            )}

            <div
              className="w-full min-w-0 max-w-full flow-root"
              data-block-row="true"
              data-row-offset-applied={rowOffsetPx ? "true" : undefined}
              style={
                blockOutline
                  ? {
                      ...offsetStyle,
                      boxShadow: blockOutline,
                      borderRadius: "var(--block-frame-radius, 12px)",
                    }
                  : offsetStyle
              }
            >
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
}