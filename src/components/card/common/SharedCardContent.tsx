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

type SharedCardContentEditCompatProps = Readonly<{
  selectionScopeKey?: string | null;
  color?: string;
  droppableId?: string;
}>;

type SharedCardContentEditProps = SharedCardContentBaseProps &
  SharedCardContentEditCompatProps &
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

const SharedCardContentViewBody = React.memo(
  ({
    blocks,
    onGalleryFullscreenChange,
    displayMode,
    zoom,
  }: SharedCardContentViewProps) => {
    const viewerProps = useViewerSceneProps({
      onGalleryFullscreenChange,
      displayMode,
      zoom,
    });

    const renderableBlocks = React.useMemo(
      () => filterRenderableCardBlocks(blocks),
      [blocks],
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
  },
);

SharedCardContentViewBody.displayName = "SharedCardContentViewBody";

const SharedCardContentEditBody = React.memo(
  ({
    blocks,
    onChange,
    prefix,
    label,
    accentColor,
    duplicateToOpposite,
    onCrossDuplicate,
    autoFocus,
    customPlaceholders,
    hideToolbar,
    onDelete,
    minDeletableIndex,
    hiddenBlockTypes,
    toolbarMount,
    toolbarDesktopLayout,
    enableBlockActiveState,
    settings,
    displayMode,
    zoom,
  }: SharedCardContentEditProps) => {
    return (
      <BlockEditor
        blocks={blocks}
        onChange={onChange}
        prefix={prefix}
        label={label}
        accentColor={accentColor}
        duplicateToOpposite={duplicateToOpposite}
        onCrossDuplicate={onCrossDuplicate}
        autoFocus={autoFocus}
        customPlaceholders={customPlaceholders}
        hideToolbar={hideToolbar}
        onDelete={onDelete}
        minDeletableIndex={minDeletableIndex}
        hiddenBlockTypes={hiddenBlockTypes}
        toolbarMount={toolbarMount}
        toolbarDesktopLayout={toolbarDesktopLayout}
        enableBlockActiveState={enableBlockActiveState}
        settings={settings}
        displayMode={displayMode}
        zoom={zoom}
      />
    );
  },
);

SharedCardContentEditBody.displayName = "SharedCardContentEditBody";

const SharedCardContentBody = React.memo((props: SharedCardContentProps) => {
  return props.mode === "view" ? (
    <SharedCardContentViewBody {...props} />
  ) : (
    <SharedCardContentEditBody {...props} />
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
