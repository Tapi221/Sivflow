import { BlockEditor } from "@/components/card/blocks/editor/BlockEditor";
import { cn } from "@/lib/utils";
import { CONTENT_TYPO } from "@/styles/tokens/typography";
import type { CardBlock } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React from "react";
import { SharedCardViewScene } from "./SharedCardViewScene";
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

const SharedCardContentEditScene = React.memo(
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

SharedCardContentEditScene.displayName = "SharedCardContentEditScene";

const SharedCardContentInner = (props: SharedCardContentProps) => {
  return (
    <SharedCardContentRoot className={props.className}>
      {props.mode === "view" ? (
        <SharedCardViewScene
          blocks={props.blocks}
          onGalleryFullscreenChange={props.onGalleryFullscreenChange}
          displayMode={props.displayMode}
          zoom={props.zoom}
        />
      ) : (
        <SharedCardContentEditScene {...props} />
      )}
    </SharedCardContentRoot>
  );
};

export const SharedCardContent = React.memo(SharedCardContentInner);
SharedCardContent.displayName = "SharedCardContent";
