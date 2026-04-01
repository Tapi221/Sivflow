import { BlockEditor } from "@/components/card/blocks/BlockEditor";
import { BlockRendererWithoutSeparators } from "@/components/card/blocks/BlockRendererWithoutSeparators";
import { shouldRenderInterBlockSeparator } from "@/components/card/blocks/blockDisplayPolicy";
import { cn } from "@/lib/utils";
import { CONTENT_TYPO } from "@/styles/tokens/typography";
import type { CardBlock } from "@/types";
import React from "react";
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
  selectionScopeKey?: string | null;
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
  toolbarMount?: HTMLDivElement | null;
  toolbarDesktopLayout?: "horizontal" | "vertical";
  enableBlockActiveState?: boolean;
  settings?: unknown;
};

export type SharedCardContentProps =
  | SharedCardContentViewProps
  | SharedCardContentEditProps;

function SharedCardContentInner(props: SharedCardContentProps) {
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
          selectionScopeKey={props.selectionScopeKey}
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
          toolbarMount={props.toolbarMount}
          toolbarDesktopLayout={props.toolbarDesktopLayout}
          enableBlockActiveState={props.enableBlockActiveState}
          settings={props.settings}
        />
      ) : (
        <div className="w-full max-w-full flex flex-col">
          {props.blocks.map((block, index) => {
            const showSeparator =
              index > 0 &&
              shouldRenderInterBlockSeparator(
                props.blocks[index - 1].type,
                block.type,
              );

            return (
              <React.Fragment key={block.id}>
                {showSeparator && (
                  <div
                    aria-hidden
                    className="pointer-events-none"
                    style={{ height: 9, display: "flex", alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 1,
                        background: "var(--card-ruled-color, rgba(0,0,0,0.05))",
                      }}
                    />
                  </div>
                )}
                <BlockRendererWithoutSeparators
                  blocks={[block]}
                  onGalleryFullscreenChange={props.onGalleryFullscreenChange}
                />
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const SharedCardContent = React.memo(SharedCardContentInner);
SharedCardContent.displayName = "SharedCardContent";