import { BlockEditor } from "@/components/card/blocks/editor/BlockEditor";
import { CardBlocksScene } from "@/components/card/blocks/shared/CardBlocksScene";
import { filterRenderableCardBlocks } from "@/components/card/blocks/shared/isRenderableCardBlock";
import { useViewerSceneProps } from "@/components/card/blocks/shared/useViewerSceneProps";
import { cn } from "@/lib/utils";
import { CONTENT_TYPO } from "@/styles/tokens/typography";
import type { CardBlock } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React from "react";
import { CARD_CONTENT_TOP_PX } from "./constants";

type SharedCardContentBaseProps = Readonly<{
  blocks: CardBlock[];
  className?: string;
}>;

type SharedCardContentViewProps = SharedCardContentBaseProps &
  Readonly<{
    mode: "view";
    onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
    displayMode?: CardDisplayMode;
    zoom?: number;
  }>;

type SharedCardContentEditProps = SharedCardContentBaseProps &
  Readonly<{
    mode: "edit";
    onChange: (blocks: CardBlock[]) => void;
    prefix: "question" | "answer";
    label: string;
    accentColor?: string;
    duplicateToOpposite?: boolean;
    onCrossDuplicate?: (block: CardBlock) => void;
    autoFocus?: boolean;
    customPlaceholders?: Record<number, string>;
    hideToolbar?: boolean;
    onDelete?: (index: number) => void;
    minDeletableIndex?: number;
    hiddenBlockTypes?: CardBlock["type"][];
    toolbarMount?: HTMLDivElement | null;
    toolbarDesktopLayout?: "horizontal" | "vertical";
    enableBlockActiveState?: boolean;
    settings?: unknown;
    displayMode?: CardDisplayMode;
    zoom?: number;
  }>;

export type SharedCardContentProps =
  | SharedCardContentViewProps
  | SharedCardContentEditProps;

const SHARED_CARD_CONTENT_ROOT_CLASS_NAME =
  "card-content-root flex min-h-0 flex-1 w-full max-w-full flex-col overflow-x-clip overflow-y-visible";

type SharedCardContentRootProps = Readonly<{
  className?: string;
  children: React.ReactNode;
}>;

const SharedCardContentRoot = React.memo(
  ({ className, children }: SharedCardContentRootProps) => (
    <div
      className={cn(
        SHARED_CARD_CONTENT_ROOT_CLASS_NAME,
        CONTENT_TYPO,
        className,
      )}
      style={{
        paddingTop: `var(--card-content-padding-top, ${CARD_CONTENT_TOP_PX}px)`,
      }}
    >
      {children}
    </div>
  ),
);

SharedCardContentRoot.displayName = "SharedCardContentRoot";

const SharedCardContentBody = React.memo((props: SharedCardContentProps) => {
  if (props.mode === "view") {
    const viewerProps = useViewerSceneProps({
      onGalleryFullscreenChange: props.onGalleryFullscreenChange,
      displayMode: props.displayMode,
      zoom: props.zoom,
    });

    const renderableBlocks = React.useMemo(
      () => filterRenderableCardBlocks(props.blocks),
      [props.blocks],
    );

    if (!renderableBlocks.length) return null;

    return (
      <CardBlocksScene
        blocks={renderableBlocks}
        resolveSceneProps={() => ({
          mode: "view",
          viewerProps,
        })}
      />
    );
  }

  return (
    <BlockEditor
      blocks={props.blocks}
      onChange={props.onChange}
      prefix={props.prefix}
      label={props.label}
      accentColor={props.accentColor}
      duplicateToOpposite={props.duplicateToOpposite}
      onCrossDuplicate={props.onCrossDuplicate}
      autoFocus={props.autoFocus}
      customPlaceholders={props.customPlaceholders}
      hideToolbar={props.hideToolbar}
      onDelete={props.onDelete}
      minDeletableIndex={props.minDeletableIndex}
      hiddenBlockTypes={props.hiddenBlockTypes}
      toolbarMount={props.toolbarMount}
      toolbarDesktopLayout={props.toolbarDesktopLayout}
      enableBlockActiveState={props.enableBlockActiveState}
      settings={props.settings}
      displayMode={props.displayMode}
      zoom={props.zoom}
    />
  );
});

SharedCardContentBody.displayName = "SharedCardContentBody";

const SharedCardContentInner = (props: SharedCardContentProps) => {
  return (
    <SharedCardContentRoot className={props.className}>
      <SharedCardContentBody {...props} />
    </SharedCardContentRoot>
  );
};

export const SharedCardContent = React.memo(SharedCardContentInner);
SharedCardContent.displayName = "SharedCardContent";
