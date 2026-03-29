import { BlockEditor } from "@/components/card/blocks/BlockEditor";
import { BlockRenderer } from "@/components/card/blocks/BlockRenderer";
import {
  CARD_RULED_OFFSET_BOTTOM_PX,
  CARD_RULED_OFFSET_TOP_PX,
  CARD_ROW_PX,
} from "@/components/card/common/constants";
import { buildCardFaceLayout, type MeasuredBlock } from "@/components/card/frame/cardFaceLayout";
import { useCardRuledContext } from "@/components/card/frame/CardSurface";
import { cn } from "@/lib/utils";
import { CONTENT_TYPO } from "@/styles/tokens/typography";
import type { CardBlock } from "@/types";
import React, { useLayoutEffect, useRef } from "react";
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

  const ruledCtx = useCardRuledContext();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (props.mode !== "view") return;
    if (!ruledCtx) return;

    const surface = ruledCtx.surfaceRef.current;
    const content = contentRef.current;
    if (!surface || !content) return;

    function measure() {
      const surface = ruledCtx!.surfaceRef.current;
      const content = contentRef.current;
      if (!surface || !content) return;

      const surfaceRect = surface.getBoundingClientRect();
      const blockEls = content.querySelectorAll<HTMLElement>("[data-block-layout-kind]");
      const measuredBlocks: MeasuredBlock[] = [];

      blockEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        measuredBlocks.push({
          kind: (el.dataset.blockLayoutKind as "normal" | "special") ?? "normal",
          top: rect.top - surfaceRect.top,
          height: rect.height,
        });
      });

      const surfaceHeight = surface.offsetHeight;
      if (surfaceHeight === 0) return;
      const ruledTop = CARD_RULED_OFFSET_TOP_PX;
      const ruledBottom = surfaceHeight - CARD_RULED_OFFSET_BOTTOM_PX;

      const { visibleRules } = buildCardFaceLayout(
        measuredBlocks,
        ruledTop,
        ruledBottom,
        CARD_ROW_PX,
      );

      ruledCtx!.setVisibleRules(visibleRules);
    }

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(surface);
    content.querySelectorAll("[data-block-layout-kind]").forEach((el) => ro.observe(el));

    return () => ro.disconnect();
  }, [props.blocks, props.mode, ruledCtx]);

  return (
    <div
      ref={props.mode === "view" ? contentRef : undefined}
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
          settings={props.settings}
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

export const SharedCardContent = React.memo(SharedCardContentInner);
SharedCardContent.displayName = "SharedCardContent";
