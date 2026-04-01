import { BlockEditor } from "@/components/card/blocks/BlockEditor";
import { BlockRenderer } from "@/components/card/blocks/BlockRenderer";
import {
  CARD_RULED_OFFSET_BOTTOM_PX,
  CARD_RULED_OFFSET_TOP_PX,
  CARD_ROW_PX,
} from "@/components/card/common/constants";
import {
  buildCardFaceLayout,
  type MeasuredBlock,
} from "@/components/card/frame/cardFaceLayout";
import { useCardRuledContext } from "@/components/card/frame/CardSurface";
import { cn } from "@/lib/utils";
import { CONTENT_TYPO } from "@/styles/tokens/typography";
import type { CardBlock } from "@/types";
import React, { useLayoutEffect, useRef } from "react";
import { CARD_CONTENT_TOP_PX } from "./constants";

/**
 * 要素の offsetTop を特定の祖先要素からの相対値で返す。
 *
 * getBoundingClientRect() の代わりに使う理由:
 *   ScaleToFitFrame が CSS transform: scale() を適用している場合、
 *   getBoundingClientRect() は screen-space（スケール済み）の座標を返す。
 *   PositionalRuledLayer の `top: y` は CSS layout-space（スケール前）なので、
 *   offsetTop を使わないとスケール ≠ 1 時に ruled 線の位置がずれる。
 */
function getOffsetTopRelativeTo(el: HTMLElement, ancestor: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = el;

  while (current && current !== ancestor) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return top;
}

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

  const ruledCtx = useCardRuledContext();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!ruledCtx) return;

    const root = contentRef.current;
    if (!root) {
      ruledCtx.setVisibleRules([]);
      return;
    }

    const blockElements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-block-layout-kind]"),
    );

    const measuredBlocks: MeasuredBlock[] = blockElements.map((el) => {
      const rawKind = el.getAttribute("data-block-layout-kind");
      const kind = rawKind === "ruled" ? "ruled" : "non-ruled";

      return {
        kind,
        top: getOffsetTopRelativeTo(el, root),
        height: el.offsetHeight,
      };
    });

    if (import.meta.env.DEV) {
      console.log(
        "[SharedCardContent] measuredBlocks",
        measuredBlocks,
        blockElements.map((el) => el.getAttribute("data-block-layout-kind")),
      );
    }

    const surfaceEl = ruledCtx.surfaceRef.current;
    if (!surfaceEl) {
      ruledCtx.setVisibleRules([]);
      return;
    }

    const ruledTop = CARD_RULED_OFFSET_TOP_PX + CARD_ROW_PX;
    const ruledBottom = surfaceEl.offsetHeight - CARD_RULED_OFFSET_BOTTOM_PX;

    const layout = buildCardFaceLayout(
      measuredBlocks,
      ruledTop,
      ruledBottom,
      CARD_ROW_PX,
    );

    if (import.meta.env.DEV) {
      console.log("[SharedCardContent] visibleRules", layout.visibleRules, {
        ruledTop,
        ruledBottom,
        surfaceHeight: surfaceEl.offsetHeight,
      });
    }

    ruledCtx.setVisibleRules(layout.visibleRules);
  }, [props.blocks, props.mode, ruledCtx]);

  return (
    <div
      ref={contentRef}
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
