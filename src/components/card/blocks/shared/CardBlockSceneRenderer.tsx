import React from "react";

import { CodeBlockItem } from "@/components/card/blocks/code/CodeBlockItem";
import { CodeRenderer } from "@/components/card/blocks/code/CodeRenderer";
import type { BlockListRowMeta } from "@/components/card/blocks/core/BlockList";
import { BlockWrapper } from "@/components/card/blocks/core/BlockWrapper";
import { ImageBlockContent } from "@/components/card/blocks/image/ImageBlockContent";
import { ImageBlockShell } from "@/components/card/blocks/image/ImageBlockShell";
import { MarkdownBlock } from "@/components/card/blocks/markdown/MarkdownBlock";
import { MarkdownBlockDisplay } from "@/components/card/blocks/markdown/MarkdownBlockDisplay";
import { MathBlock } from "@/components/card/blocks/math/MathBlock";
import { MathBlockPreviewPane } from "@/components/card/blocks/math/MathBlockPreviewPane";
import { QuestionBlock } from "@/components/card/blocks/question/QuestionBlock";
import { QuestionBlockContent } from "@/components/card/blocks/question/QuestionBlockContent";
import { TextBlockContent } from "@/components/card/blocks/text/TextBlockContent";
import { AudioPlayer } from "@/components/card/media/CardMedia";
import { cn } from "@/lib/utils";
import type { CodeBlockData } from "@/types/core/code-block";
import type { UploadedImage } from "@/types/domain/assets";
import type { CardBlock } from "@/types/domain/card";
import { Code, HelpCircle, NotebookPen, Sigma, Type } from "@/ui/icons";

export type CardBlockLayoutReplaceBlock =
  | { type: "markdown"; markdown: string }
  | { type: "code"; code: { language: string; code: string } };

export type ViewerProps = Readonly<{
  questionDisplayMode: "always" | "tap_to_reveal";
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
  toMediaUrl: (
    item:
      | string
      | {
          url?: string | null;
          remoteUrl?: string | null;
          localUrl?: string | null;
        }
      | null
      | undefined,
  ) => string | null;
  displayMode: "fixed" | "fluid";
  zoom: number;
}>;

export type EditorProps = Readonly<{
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
  displayMode?: "fixed" | "fluid";
  zoom?: number;
}>;

type CardBlockSceneRendererProps =
  | Readonly<{
      mode: "edit";
      block: CardBlock;
      meta: BlockListRowMeta;
      editorProps: EditorProps;
    }>
  | Readonly<{
      mode: "view";
      block: CardBlock;
      meta: BlockListRowMeta;
      viewerProps: ViewerProps;
    }>;

type SharedShellProps = Readonly<{
  mode: "edit" | "view";
  className?: string;
  contentClassName?: string;
  label?: string;
  icon?: React.ElementType;
  accentColor?: string;
  isActive?: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  dragHandleClassName?: string;
  children: React.ReactNode;
}>;

const NOOP = () => {};

const renderGridOffsetSpacer = (gridOffsetPx: number) =>
  gridOffsetPx > 0 ? (
    <div
      aria-hidden
      className="pointer-events-none"
      style={{ height: `${gridOffsetPx}px` }}
    />
  ) : null;

const SharedBlockShell = ({
  mode,
  className,
  contentClassName,
  label,
  icon,
  accentColor,
  isActive,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
  canMoveUp,
  canMoveDown,
  dragHandleClassName,
  children,
}: SharedShellProps) => {
  if (mode === "view") {
    return (
      <BlockWrapper
        mode="viewer"
        showOverlay={false}
        showDelete={false}
        showDuplicate={false}
        showDragHandle={false}
        dragEnabled={false}
        onDelete={NOOP}
        onDuplicate={NOOP}
        className={className}
        contentClassName={contentClassName}
      >
        {children}
      </BlockWrapper>
    );
  }

  return (
    <BlockWrapper
      onDelete={onDelete ?? NOOP}
      onDuplicate={onDuplicate ?? NOOP}
      className={className}
      contentClassName={contentClassName}
      label={label}
      icon={icon}
      accentColor={accentColor}
      isActive={isActive}
      canMoveUp={Boolean(canMoveUp)}
      canMoveDown={Boolean(canMoveDown)}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
      dragHandleClassName={dragHandleClassName}
    >
      {children}
    </BlockWrapper>
  );
};

const TextBlockScene = ({
  mode,
  block,
  editorProps,
  viewerProps,
}: Readonly<{
  mode: "edit" | "view";
  block: CardBlock;
  editorProps?: EditorProps;
  viewerProps?: ViewerProps;
}>) => {
  const isEmpty = (block.content ?? "").trim().length === 0;

  return (
    <SharedBlockShell
      mode={mode}
      className={cn("bg-transparent px-0 py-0", !isEmpty && "border-0")}
      contentClassName="px-0"
      label="Text"
      icon={Type}
      accentColor={editorProps?.accentColor}
      isActive={editorProps?.isActive}
      onDelete={editorProps?.onDelete}
      onDuplicate={editorProps?.onDuplicate}
      onMoveUp={editorProps?.onMoveUp}
      onMoveDown={editorProps?.onMoveDown}
      onMoveDragStart={editorProps?.onMoveDragStart}
      onMoveDragEnd={editorProps?.onMoveDragEnd}
      canMoveUp={editorProps?.canMoveUp}
      canMoveDown={editorProps?.canMoveDown}
      dragHandleClassName="js-block-drag-handle"
    >
      {mode === "edit" && editorProps ? (
        <TextBlockContent
          mode="edit"
          content={block.content ?? ""}
          onChange={(content) =>
            editorProps.onUpdateBlock(block.id, { content })
          }
          placeholder={editorProps.customPlaceholder || "文章を入力..."}
          autoFocus={editorProps.autoFocus}
          zoom={editorProps.zoom}
        />
      ) : (
        <TextBlockContent
          mode="view"
          content={String(block.content ?? "")}
          zoom={viewerProps?.zoom}
        />
      )}
    </SharedBlockShell>
  );
};

const QuestionBlockScene = ({
  mode,
  block,
  editorProps,
  viewerProps,
}: Readonly<{
  mode: "edit" | "view";
  block: CardBlock;
  editorProps?: EditorProps;
  viewerProps?: ViewerProps;
}>) => {
  if (mode === "edit" && editorProps) {
    return (
      <QuestionBlock
        block={block}
        onUpdateBlock={editorProps.onUpdateBlock}
        onDelete={editorProps.onDelete}
        onDuplicate={editorProps.onDuplicate}
        onMoveUp={editorProps.onMoveUp}
        onMoveDown={editorProps.onMoveDown}
        onMoveDragStart={editorProps.onMoveDragStart}
        onMoveDragEnd={editorProps.onMoveDragEnd}
        canMoveUp={editorProps.canMoveUp}
        canMoveDown={editorProps.canMoveDown}
        dragHandleClassName="js-block-drag-handle"
        accentColor={editorProps.accentColor}
        isActive={editorProps.isActive}
        zoom={editorProps.zoom}
      />
    );
  }

  return (
    <SharedBlockShell
      mode="view"
      className="bg-transparent px-0 py-0"
      contentClassName="px-0"
    >
      <QuestionBlockContent
        mode="view"
        questionTitle={block.questionTitle}
        questionAnswer={block.questionAnswer}
        answerDisplayMode={viewerProps?.questionDisplayMode}
        zoom={viewerProps?.zoom}
      />
    </SharedBlockShell>
  );
};

const CodeBlockScene = ({
  mode,
  block,
  meta,
  editorProps,
  viewerProps,
}: Readonly<{
  mode: "edit" | "view";
  block: CardBlock;
  meta: BlockListRowMeta;
  editorProps?: EditorProps;
  viewerProps?: ViewerProps;
}>) => {
  if (mode === "edit" && editorProps) {
    return (
      <div className="w-full max-w-full overflow-visible">
        {renderGridOffsetSpacer(meta.gridOffsetPx)}
        <CodeBlockItem
          data={block.code || { language: "javascript", code: "" }}
          onChange={(data) =>
            editorProps.onUpdateBlock(block.id, { code: data as CodeBlockData })
          }
          onDelete={editorProps.onDelete}
          onDuplicate={editorProps.onDuplicate}
          onMoveUp={editorProps.onMoveUp}
          onMoveDown={editorProps.onMoveDown}
          onMoveDragStart={editorProps.onMoveDragStart}
          onMoveDragEnd={editorProps.onMoveDragEnd}
          canMoveUp={editorProps.canMoveUp}
          canMoveDown={editorProps.canMoveDown}
          dragHandleClassName="js-block-drag-handle"
          accentColor={editorProps.accentColor}
          isActive={editorProps.isActive}
          zoom={editorProps.zoom}
        />
      </div>
    );
  }

  return (
    <SharedBlockShell
      mode="view"
      className={cn(
        "bg-transparent px-0 py-0",
        (block.code?.code ?? "").trim().length > 0 && "border-0",
      )}
      contentClassName="relative px-0"
    >
      <div className="w-full max-w-full overflow-visible">
        {renderGridOffsetSpacer(meta.gridOffsetPx)}
        <CodeRenderer
          code={block.code?.code ?? ""}
          language={block.code?.language}
          zoom={viewerProps?.zoom}
        />
      </div>
    </SharedBlockShell>
  );
};

const ImageBlockScene = ({
  mode,
  block,
  editorProps,
  viewerProps,
}: Readonly<{
  mode: "edit" | "view";
  block: CardBlock;
  editorProps?: EditorProps;
  viewerProps?: ViewerProps;
}>) => {
  const hasItems = (block.images?.length ?? 0) > 0;

  return (
    <SharedBlockShell
      mode={mode}
      className={cn("py-0 px-0", hasItems && "border-transparent")}
      contentClassName="px-0"
      label="Image"
      accentColor={editorProps?.accentColor}
      isActive={editorProps?.isActive}
      onDelete={editorProps?.onDelete}
      onDuplicate={editorProps?.onDuplicate}
      onMoveUp={editorProps?.onMoveUp}
      onMoveDown={editorProps?.onMoveDown}
      onMoveDragStart={editorProps?.onMoveDragStart}
      onMoveDragEnd={editorProps?.onMoveDragEnd}
      canMoveUp={editorProps?.canMoveUp}
      canMoveDown={editorProps?.canMoveDown}
      dragHandleClassName="js-block-drag-handle"
    >
      <ImageBlockShell showBorderOverlay={mode === "edit"}>
        {mode === "edit" && editorProps ? (
          <ImageBlockContent
            mode="edit"
            urls={(block.images ?? []) as UploadedImage[]}
            onChange={(images) =>
              editorProps.onUpdateBlock(block.id, { images })
            }
            initialFile={editorProps.pendingUploadFile}
            onConsumeInitialFile={editorProps.onConsumePendingUpload}
            onFilesExcess={editorProps.onFilesExcess}
            displayMode={editorProps.displayMode}
            zoom={editorProps.zoom}
          />
        ) : (
          <ImageBlockContent
            mode="view"
            urls={[]}
            items={(block.images ?? []) as UploadedImage[]}
            onFullscreenChange={viewerProps?.onGalleryFullscreenChange}
            displayMode={viewerProps?.displayMode}
            zoom={viewerProps?.zoom}
          />
        )}
      </ImageBlockShell>
    </SharedBlockShell>
  );
};

const AudioBlockScene = ({
  block,
  viewerProps,
}: Readonly<{
  block: CardBlock;
  viewerProps: ViewerProps;
}>) => {
  return (
    <div className="flex justify-center">
      <AudioPlayer
        urls={(block.audios ?? [])
          .map(viewerProps.toMediaUrl)
          .filter((url): url is string => Boolean(url))}
      />
    </div>
  );
};

const MathBlockScene = ({
  mode,
  block,
  meta,
  editorProps,
  viewerProps,
}: Readonly<{
  mode: "edit" | "view";
  block: CardBlock;
  meta: BlockListRowMeta;
  editorProps?: EditorProps;
  viewerProps?: ViewerProps;
}>) => {
  if (mode === "edit" && editorProps) {
    return (
      <div className="w-full max-w-full overflow-visible">
        {renderGridOffsetSpacer(meta.gridOffsetPx)}
        <MathBlock
          data={block.math || { latex: "", displayMode: "block" }}
          onChange={(data) =>
            editorProps.onUpdateBlock(block.id, { math: data })
          }
          onDelete={editorProps.onDelete}
          onDuplicate={editorProps.onDuplicate}
          dragHandleClassName="js-block-drag-handle"
          accentColor={editorProps.accentColor}
          isActive={editorProps.isActive}
          onMoveUp={editorProps.onMoveUp}
          onMoveDown={editorProps.onMoveDown}
          onMoveDragStart={editorProps.onMoveDragStart}
          onMoveDragEnd={editorProps.onMoveDragEnd}
          canMoveUp={editorProps.canMoveUp}
          canMoveDown={editorProps.canMoveDown}
          zoom={editorProps.zoom}
        />
      </div>
    );
  }

  return (
    <SharedBlockShell
      mode="view"
      className={cn(
        (block.math?.latex ?? "").trim().length > 0 && "border-transparent",
      )}
    >
      <div className="w-full max-w-full overflow-visible space-y-1.5 px-2 py-0.5">
        {renderGridOffsetSpacer(meta.gridOffsetPx)}
        <MathBlockPreviewPane
          latex={block.math?.latex || ""}
          displayMode={block.math?.displayMode || "block"}
          className="rounded-lg"
          zoom={viewerProps?.zoom}
        />
      </div>
    </SharedBlockShell>
  );
};

const MarkdownBlockScene = ({
  mode,
  block,
  editorProps,
  viewerProps,
}: Readonly<{
  mode: "edit" | "view";
  block: CardBlock;
  editorProps?: EditorProps;
  viewerProps?: ViewerProps;
}>) => {
  if (mode === "edit" && editorProps) {
    return (
      <MarkdownBlock
        markdown={block.markdown || ""}
        onChange={(markdown) =>
          editorProps.onUpdateBlock(block.id, { markdown })
        }
        onDelete={editorProps.onDelete}
        onDuplicate={editorProps.onDuplicate}
        dragHandleClassName="js-block-drag-handle"
        accentColor={editorProps.accentColor}
        isActive={editorProps.isActive}
        onMoveUp={editorProps.onMoveUp}
        onMoveDown={editorProps.onMoveDown}
        onMoveDragStart={editorProps.onMoveDragStart}
        onMoveDragEnd={editorProps.onMoveDragEnd}
        canMoveUp={editorProps.canMoveUp}
        canMoveDown={editorProps.canMoveDown}
        onReplaceWithBlocks={editorProps.onReplaceMarkdownWithBlocks}
        zoom={editorProps.zoom}
      />
    );
  }

  return (
    <SharedBlockShell
      mode="view"
      className={cn(
        "bg-transparent px-0 py-0",
        (block.markdown ?? "").trim().length > 0 && "border-0",
      )}
      contentClassName="px-0"
    >
      <MarkdownBlockDisplay
        markdown={block.markdown ?? ""}
        zoom={viewerProps?.zoom}
      />
    </SharedBlockShell>
  );
};

export const CardBlockSceneRenderer = (props: CardBlockSceneRendererProps) => {
  const { block, meta } = props;

  switch (block.type) {
    case "text":
      return (
        <TextBlockScene
          mode={props.mode}
          block={block}
          editorProps={props.mode === "edit" ? props.editorProps : undefined}
          viewerProps={props.mode === "view" ? props.viewerProps : undefined}
        />
      );
    case "question":
      return (
        <QuestionBlockScene
          mode={props.mode}
          block={block}
          editorProps={props.mode === "edit" ? props.editorProps : undefined}
          viewerProps={props.mode === "view" ? props.viewerProps : undefined}
        />
      );
    case "code":
      return (
        <CodeBlockScene
          mode={props.mode}
          block={block}
          meta={meta}
          editorProps={props.mode === "edit" ? props.editorProps : undefined}
          viewerProps={props.mode === "view" ? props.viewerProps : undefined}
        />
      );
    case "image":
      return (
        <ImageBlockScene
          mode={props.mode}
          block={block}
          editorProps={props.mode === "edit" ? props.editorProps : undefined}
          viewerProps={props.mode === "view" ? props.viewerProps : undefined}
        />
      );
    case "audio":
      return props.mode === "view" ? (
        <AudioBlockScene block={block} viewerProps={props.viewerProps} />
      ) : null;
    case "math":
      return (
        <MathBlockScene
          mode={props.mode}
          block={block}
          meta={meta}
          editorProps={props.mode === "edit" ? props.editorProps : undefined}
          viewerProps={props.mode === "view" ? props.viewerProps : undefined}
        />
      );
    case "markdown":
      return (
        <MarkdownBlockScene
          mode={props.mode}
          block={block}
          editorProps={props.mode === "edit" ? props.editorProps : undefined}
          viewerProps={props.mode === "view" ? props.viewerProps : undefined}
        />
      );
    default:
      return null;
  }
};
