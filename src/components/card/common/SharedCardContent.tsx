import React from "react";
import type { CardBlock } from "@/types";
import { cn } from "@/lib/utils";
import { CONTENT_TYPO } from "@/styles/tokens/typography";
import { BlockRenderer } from "../blocks/BlockRenderer";
import { BlockEditor } from "../blocks/BlockEditor";
import { CARD_CONTENT_TOP_PX } from "./constants";

type SharedCardContentBaseProps = {
  blocks: CardBlock[];
  className?: string;
};

type SharedCardContentViewProps = SharedCardContentBaseProps & {
  mode: "view";
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
};

type SharedCardContentEditProps = SharedCardContentBaseProps & {
  mode: "edit";
  onChange: (blocks: CardBlock[]) => void;
  prefix: "question" | "answer";
  label: string;
  color: string;
  droppableId: string;
  accentColor?: string;
  duplicateToOpposite?: boolean;
  onCrossDuplicate?: (block: CardBlock) => void;
  autoFocus?: boolean;
  customPlaceholders?: Record<number, string>;
  hideToolbar?: boolean;
  onDelete?: (index: number) => void;
  minDeletableIndex?: number;
  hiddenBlockTypes?: CardBlock["type"][];
  toolbarMountRef?: React.RefObject<HTMLDivElement | null>;
};

export type SharedCardContentProps =
  | SharedCardContentViewProps
  | SharedCardContentEditProps;

export function SharedCardContent(props: SharedCardContentProps) {
  const rootClassName =
    props.mode === "edit"
      ? "card-content-root flex min-h-0 flex-col w-full max-w-full overflow-x-clip overflow-y-visible"
      : "card-content-root flex min-h-0 flex-1 flex-col w-full max-w-full overflow-x-clip overflow-y-visible";

  return (
    <div
      className={cn(rootClassName, CONTENT_TYPO, props.className)}
      style={{
        paddingTop: `var(--card-content-padding-top, ${CARD_CONTENT_TOP_PX}px)`,
      }}
    >
      {props.mode === "edit" ? (
        <BlockEditor
          blocks={props.blocks}
          onChange={props.onChange}
          prefix={props.prefix}
          label={props.label}
          color={props.color}
          droppableId={props.droppableId}
          accentColor={props.accentColor}
          duplicateToOpposite={props.duplicateToOpposite}
          onCrossDuplicate={props.onCrossDuplicate}
          autoFocus={props.autoFocus}
          customPlaceholders={props.customPlaceholders}
          hideToolbar={props.hideToolbar}
          onDelete={props.onDelete}
          minDeletableIndex={props.minDeletableIndex}
          hiddenBlockTypes={props.hiddenBlockTypes}
          toolbarMountRef={props.toolbarMountRef}
        />
      ) : (
        <BlockRenderer
          blocks={props.blocks}
          onGalleryFullscreenChange={props.onGalleryFullscreenChange}
        />
      )}
    </div>
  );
}



