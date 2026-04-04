import { CodeRenderer } from "@/components/card/blocks/code/CodeRenderer";
import { BlockList } from "@/components/card/blocks/core/BlockList";
import { ImageBlockContent } from "@/components/card/blocks/image/ImageBlockContent";
import { ImageBlockShell } from "@/components/card/blocks/image/ImageBlockShell";
import { MarkdownBlockDisplay } from "@/components/card/blocks/markdown/MarkdownBlockDisplay";
import { MathBlockPreviewPane } from "@/components/card/blocks/math/MathBlockPreviewPane";
import { QuestionBlockContent } from "@/components/card/blocks/question/QuestionBlockContent";
import { TextBlockContent } from "@/components/card/blocks/text/TextBlockContent";
import { AudioPlayer } from "@/components/card/media/CardMedia";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import type { CardBlock } from "@/types/domain/card";
import type { CSSProperties } from "react";
import { useCallback, useMemo } from "react";

interface BlockRendererProps {
  blocks?: CardBlock[];
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
  displayMode?: "fixed" | "fluid";
  zoom?: number;
}

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
        <QuestionBlockContent
          mode="view"
          questionTitle={block.questionTitle}
          questionAnswer={block.questionAnswer}
          answerDisplayMode={questionDisplayMode}
        />
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
        <ImageBlockShell>
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
        <MarkdownBlockDisplay
          markdown={block.markdown}
          style={getFluidZoomStyle(displayMode, zoom)}
        />
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
    <BlockList
      blocks={renderableBlocks}
      renderBlock={(block, meta) =>
        renderBlock(block, {
          questionDisplayMode,
          gridOffsetPx: meta.gridOffsetPx,
          onGalleryFullscreenChange,
          toMediaUrl,
          displayMode,
          zoom,
        })
      }
    />
  );
};