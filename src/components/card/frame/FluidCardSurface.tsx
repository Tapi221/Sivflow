import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import { cn } from "@/lib/utils";
import type { CardBlock } from "@/types/domain/card";
import React from "react";

const FLUID_CARD_CONTENT_STYLE = {
  "--card-content-padding-top": "0px",
} as React.CSSProperties & Record<"--card-content-padding-top", string>;

type FluidCardSurfaceProps = {
  blocks: CardBlock[];
  contentRef: React.RefObject<HTMLDivElement | null>;
  isCardClickable: boolean;
  showInkNotice: boolean;
  extraHeaderRight?: React.ReactNode;
  extraFooter?: React.ReactNode;
  actionsTopLeft?: React.ReactNode[];
  actionsTopRight?: React.ReactNode[];
  onCardClick?: React.MouseEventHandler<HTMLDivElement>;
  onCardKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
};

export function FluidCardSurface({
  blocks,
  contentRef,
  isCardClickable,
  showInkNotice,
  extraHeaderRight,
  extraFooter,
  actionsTopLeft,
  actionsTopRight,
  onCardClick,
  onCardKeyDown,
  onGalleryFullscreenChange,
}: FluidCardSurfaceProps) {
  return (
    <div
      className={cn(
        "premium-paper-depth card-shell--interactive relative w-full overflow-hidden rounded-[28px] px-4 py-4 md:px-6",
        isCardClickable && "cursor-pointer",
      )}
      role={isCardClickable ? "button" : undefined}
      tabIndex={isCardClickable ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
    >
      {(showInkNotice || extraHeaderRight || actionsTopLeft || actionsTopRight) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {showInkNotice && (
              <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-[12px] font-medium leading-5 text-amber-900">
                <div>このカードには手書きがあります</div>
                <div>固定表示で確認できます</div>
              </div>
            )}
            {actionsTopLeft && (
              <div className="flex flex-wrap items-center gap-2">
                {actionsTopLeft.map((action, index) => (
                  <div key={`fluid-left-${index}`} className="flex">
                    {action}
                  </div>
                ))}
              </div>
            )}
          </div>
          {(extraHeaderRight || actionsTopRight) && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {extraHeaderRight ? (
                <div className="flex" onClick={(event) => event.stopPropagation()}>
                  {extraHeaderRight}
                </div>
              ) : null}
              {actionsTopRight?.map((action, index) => (
                <div key={`fluid-right-${index}`} className="flex">
                  {action}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={contentRef} className="w-full max-w-full" style={FLUID_CARD_CONTENT_STYLE}>
        <SharedCardContent
          mode="view"
          blocks={blocks}
          onGalleryFullscreenChange={onGalleryFullscreenChange}
        />
      </div>

      {extraFooter ? (
        <div className="mt-4" onClick={(event) => event.stopPropagation()}>
          {extraFooter}
        </div>
      ) : null}
    </div>
  );
}
