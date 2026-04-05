import React from "react";

import { CodeBlockItem } from "@/components/card/blocks/code/CodeBlockItem";
import { CodeRenderer } from "@/components/card/blocks/code/CodeRenderer";
import type { BlockListRowMeta } from "@/components/card/blocks/core/BlockList";
import { BlockWrapper } from "@/components/card/blocks/core/BlockWrapper";
import { ImageBlockContent } from "@/components/card/blocks/image/ImageBlockContent";
import { ImageBlockShell } from "@/components/card/blocks/image/ImageBlockShell";
import { MediaBlock } from "@/components/card/blocks/image/MediaBlock";
import { MarkdownBlock } from "@/components/card/blocks/markdown/MarkdownBlock";
import { MarkdownBlockDisplay } from "@/components/card/blocks/markdown/MarkdownBlockDisplay";
import { MathBlock } from "@/components/card/blocks/math/MathBlock";
import { MathBlockPreviewPane } from "@/components/card/blocks/math/MathBlockPreviewPane";
import { QuestionBlock } from "@/components/card/blocks/question/QuestionBlock";
import { QuestionBlockContent } from "@/components/card/blocks/question/QuestionBlockContent";
import { TextBlock } from "@/components/card/blocks/text/TextBlock";
import { TextBlockContent } from "@/components/card/blocks/text/TextBlockContent";
import { AudioPlayer } from "@/components/card/media/CardMedia";
import { cn } from "@/lib/utils";
import type { CodeBlockData } from "@/types/core/code-block";
import type { UploadedImage } from "@/types/domain/assets";
import type { CardBlock } from "@/types/domain/card";

export type CardBlockLayoutReplaceBlock =
  | { type: "markdown"; markdown: string }
  | { type: "code"; code: { language: string; code: string } };

type ViewerProps = {
  questionDisplayMode: "always" | "tap_to_reveal";
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
  toMediaUrl: (item: any) => string | null;
  displayMode: "fixed" | "fluid";
  zoom: number;
};

type EditorProps = {
  onUpdateBlock: (id: string, updates: Partial<CardBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  accentColor?: string;
  isActive?: boolean;
  autoFocus?: boolean;
  customPlaceholder?: string;
  pendingUploadFile?: File;
  onConsumePendingUpload?: () => void;
  onFilesExcess?: (files: File[]) => void;
  onReplaceMarkdownWithBlocks?: (blocks: CardBlockLayoutReplaceBlock[]) => void;
};

type CardBlockLayoutRendererProps =
  | {
      mode: "edit";
      block: CardBlock;
      meta: BlockListRowMeta;
      editorProps: EditorProps;
    }
  | {
      mode: "view";
      block: CardBlock;
      meta: BlockListRowMeta;
      viewerProps: ViewerProps;
    };

const NOOP = () => {};

const getFluidZoomStyle = (
  displayMode: "fixed" | "fluid",
  zoom: number,
): React.CSSProperties | undefined => {
  if (displayMode !== "fluid") return undefined;

  const safeZoom =
    typeof zoom === "number" && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  if (Math.abs(safeZoom - 1) < 0.001) return undefined;

  return { fontSize: `${safeZoom}em` };
};

const renderGridOffsetSpacer = (gridOffsetPx: number) =>
  gridOffsetPx > 0 ? (
    <div
      aria-hidden
      className="pointer-events-none"
      style={{ height: `${gridOffsetPx}px` }}
    />
  ) : null;

const VIEWER_WRAPPER_PROPS = {
  mode: "viewer" as const,
  showOverlay: false,
  showDelete: false,
  showDuplicate: false,
  showDragHandle: false,
  dragEnabled: false,
  onDelete: NOOP,
  onDuplicate: NOOP,
};

/**
 * 編集モードと閲覧モードで共通のブロックレンダリングロジックを提供するコンポーネント。
 */
export const CardBlockLayoutRenderer = (
  props: CardBlockLayoutRendererProps,
) => {
  const { block, meta } = props;

  if (props.mode === "edit") {
    const {
      editorProps: {
        onUpdateBlock,
        onDelete,
        onDuplicate,
        onMoveUp,
        onMoveDown,
        onMoveDragStart,
        onMoveDragEnd,
        canMoveUp,
        canMoveDown,
        accentColor,
        isActive,
        autoFocus,
        customPlaceholder,
        pendingUploadFile,
        onConsumePendingUpload,
        onFilesExcess,
        onReplaceMarkdownWithBlocks,
      },
    } = props;

    switch (block.type) {
      case "text":
        return (
          <TextBlock
            content={block.content || ""}
            onChange={(content) => onUpdateBlock(block.id, { content })}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onMoveDragStart={onMoveDragStart}
            onMoveDragEnd={onMoveDragEnd}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            dragHandleProps={undefined}
            dragEnabled={true}
            dragHandleClassName="js-block-drag-handle"
            accentColor={accentColor}
            isActive={isActive}
            placeholder={customPlaceholder || "文章を入力..."}
            autoFocus={autoFocus}
          />
        );

      case "code":
        return (
          <div className="w-full max-w-full overflow-visible">
            {renderGridOffsetSpacer(meta.gridOffsetPx)}
            <CodeBlockItem
              data={
                block.code || {
                  language: "javascript",
                  code: "",
                }
              }
              onChange={(data) =>
                onUpdateBlock(block.id, { code: data as CodeBlockData })
              }
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onMoveDragStart={onMoveDragStart}
              onMoveDragEnd={onMoveDragEnd}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
              dragHandleProps={undefined}
              dragEnabled={true}
              dragHandleClassName="js-block-drag-handle"
              accentColor={accentColor}
              isActive={isActive}
            />
          </div>
        );

      case "image":
        return (
          <MediaBlock
            data={(block.images || []) as any[]}
            onChange={(data) =>
              onUpdateBlock(block.id, { images: data as UploadedImage[] })
            }
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            dragHandleProps={undefined}
            dragHandleClassName="js-block-drag-handle"
            accentColor={accentColor}
            isActive={isActive}
            initialFile={pendingUploadFile}
            onConsumeInitialFile={onConsumePendingUpload}
            onFilesExcess={onFilesExcess}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onMoveDragStart={onMoveDragStart}
            onMoveDragEnd={onMoveDragEnd}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
          />
        );

      case "math":
        return (
          <div className="w-full max-w-full overflow-visible">
            {renderGridOffsetSpacer(meta.gridOffsetPx)}
            <MathBlock
              data={
                block.math || {
                  latex: "",
                  displayMode: "block",
                }
              }
              onChange={(data) => onUpdateBlock(block.id, { math: data })}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              dragHandleProps={undefined}
              dragHandleClassName="js-block-drag-handle"
              accentColor={accentColor}
              isActive={isActive}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onMoveDragStart={onMoveDragStart}
              onMoveDragEnd={onMoveDragEnd}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
            />
          </div>
        );

      case "question":
        return (
          <QuestionBlock
            block={block}
            onUpdateBlock={onUpdateBlock}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onMoveDragStart={onMoveDragStart}
            onMoveDragEnd={onMoveDragEnd}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            dragHandleProps={undefined}
            dragEnabled={true}
            dragHandleClassName="js-block-drag-handle"
            accentColor={accentColor}
            isActive={isActive}
          />
        );

      case "markdown":
        return (
          <MarkdownBlock
            markdown={block.markdown || ""}
            onChange={(markdown) => onUpdateBlock(block.id, { markdown })}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            dragHandleProps={undefined}
            dragHandleClassName="js-block-drag-handle"
            accentColor={accentColor}
            isActive={isActive}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onMoveDragStart={onMoveDragStart}
            onMoveDragEnd={onMoveDragEnd}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onReplaceWithBlocks={onReplaceMarkdownWithBlocks}
          />
        );

      default:
        return null;
    }
  }

  const { viewerProps } = props;
  const fluidZoomStyle = getFluidZoomStyle(
    viewerProps.displayMode,
    viewerProps.zoom,
  );

  switch (block.type) {
    case "question":
      return (
        <BlockWrapper
          {...VIEWER_WRAPPER_PROPS}
          className="bg-transparent px-0 py-0"
          contentClassName="px-0"
        >
          <QuestionBlockContent
            mode="view"
            questionTitle={block.questionTitle}
            questionAnswer={block.questionAnswer}
            answerDisplayMode={viewerProps.questionDisplayMode}
          />
        </BlockWrapper>
      );

    case "text":
      return (
        <BlockWrapper
          {...VIEWER_WRAPPER_PROPS}
          className={cn(
            "bg-transparent px-0 py-0",
            (block.content ?? "").trim().length > 0 && "border-0",
          )}
          contentClassName="px-0"
        >
          <div style={fluidZoomStyle}>
            <TextBlockContent
              mode="view"
              content={String(block.content ?? "")}
            />
          </div>
        </BlockWrapper>
      );

    case "code":
      return (
        <BlockWrapper
          {...VIEWER_WRAPPER_PROPS}
          className={cn(
            "bg-transparent px-0 py-0",
            (block.code?.code ?? "").trim().length > 0 && "border-0",
          )}
          contentClassName="relative px-0"
        >
          <div
            className="w-full max-w-full overflow-visible"
            style={fluidZoomStyle}
          >
            {renderGridOffsetSpacer(meta.gridOffsetPx)}
            <CodeRenderer
              code={block.code?.code ?? ""}
              language={block.code?.language}
            />
          </div>
        </BlockWrapper>
      );

    case "image":
      return (
        <BlockWrapper
          {...VIEWER_WRAPPER_PROPS}
          className={cn(
            "py-0 px-0",
            (block.images?.length ?? 0) > 0 && "border-transparent",
          )}
          contentClassName="px-0"
        >
          <ImageBlockShell>
            <ImageBlockContent
              mode="view"
              urls={(block.images ?? [])
                .map(viewerProps.toMediaUrl)
                .filter((url): url is string => Boolean(url))}
              items={block.images ?? []}
              onFullscreenChange={viewerProps.onGalleryFullscreenChange}
              displayMode={viewerProps.displayMode}
              zoom={viewerProps.zoom}
            />
          </ImageBlockShell>
        </BlockWrapper>
      );

    case "audio":
      return (
        <div className="flex justify-center">
          <AudioPlayer
            urls={(block.audios ?? [])
              .map(viewerProps.toMediaUrl)
              .filter((url): url is string => Boolean(url))}
          />
        </div>
      );

    case "math":
      return (
        <BlockWrapper
          {...VIEWER_WRAPPER_PROPS}
          className={cn(
            (block.math?.latex ?? "").trim().length > 0 && "border-transparent",
          )}
        >
          <div
            className="w-full max-w-full overflow-visible space-y-1.5 px-2 py-0.5"
            style={fluidZoomStyle}
          >
            {renderGridOffsetSpacer(meta.gridOffsetPx)}
            <MathBlockPreviewPane
              latex={block.math?.latex || ""}
              displayMode={block.math?.displayMode || "block"}
              className="rounded-lg"
            />
          </div>
        </BlockWrapper>
      );

    case "markdown":
      return (
        <BlockWrapper
          {...VIEWER_WRAPPER_PROPS}
          className={cn(
            "bg-transparent px-0 py-0",
            (block.markdown ?? "").trim().length > 0 && "border-0",
          )}
          contentClassName="px-0"
        >
          <MarkdownBlockDisplay
            markdown={block.markdown ?? ""}
            style={fluidZoomStyle}
          />
        </BlockWrapper>
      );

    default:
      return null;
  }
};
