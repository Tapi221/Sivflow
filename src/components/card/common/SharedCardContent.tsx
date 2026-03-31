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

      // ── 早期終了: special ブロック（code / question-table）がなければ
      //    全ルール線が表示される → RuledLayer（CSS グラデーション）と同一結果。
      //    getBoundingClientRect + setVisibleRules を省略して余分な再レンダーを防ぐ。
      const specialEls = content.querySelectorAll<HTMLElement>(
        "[data-block-layout-kind='special']",
      );
      if (specialEls.length === 0) return;

      // ── ブロック位置計測: offsetTop / offsetHeight を使う。
      //    getBoundingClientRect() は ScaleToFitFrame の CSS transform 後の
      //    screen-space 座標を返すため、PositionalRuledLayer の CSS top（layout-space）
      //    と座標系が食い違う。offsetTop はレイアウト空間の値でスケール不変。
      const allBlockEls = content.querySelectorAll<HTMLElement>(
        "[data-block-layout-kind]",
      );
      const measuredBlocks: MeasuredBlock[] = [];
      allBlockEls.forEach((el) => {
        measuredBlocks.push({
          kind: (el.dataset.blockLayoutKind as "normal" | "special") ?? "normal",
          top: getOffsetTopRelativeTo(el, surface),
          height: el.offsetHeight,
        });
      });

      const surfaceHeight = surface.offsetHeight;
      if (surfaceHeight === 0) return;

      const { visibleRules } = buildCardFaceLayout(
        measuredBlocks,
        CARD_RULED_OFFSET_TOP_PX,
        surfaceHeight - CARD_RULED_OFFSET_BOTTOM_PX,
        CARD_ROW_PX,
      );

      ruledCtx!.setVisibleRules(visibleRules);
    }

    // ── 初回: useLayoutEffect 内で同期実行（paint 前に確定）
    measure();

    // ── ResizeObserver: RAF でデバウンスして同フレームの forced reflow を防ぐ。
    //    ResizeObserver callback は DOM 変更直後に呼ばれる可能性があり、
    //    その場でレイアウト読み取りを行うと forced reflow になる。
    let pendingRaf = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(pendingRaf);
      pendingRaf = requestAnimationFrame(measure);
    };

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(surface);
    content
      .querySelectorAll("[data-block-layout-kind]")
      .forEach((el) => ro.observe(el));

    return () => {
      ro.disconnect();
      cancelAnimationFrame(pendingRaf);
    };
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
