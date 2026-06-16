import React from "react";
import { cn } from "@web-renderer/lib/utils";



type FaceSwitchBadgeProps = Readonly<{
  isFlipped: boolean;
  onShowFront: () => void;
  onShowBack: () => void;
}>;



const FaceSwitchBadge = ({
  isFlipped,
  onShowFront,
  onShowBack,
}: FaceSwitchBadgeProps) => {
  const itemClassName =
    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold leading-none transition";

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-[2px]"
      data-card-no-flip="true"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        data-card-no-flip="true"
        aria-label="表面を表示"
        aria-pressed={!isFlipped}
        className={cn(
          itemClassName,
          !isFlipped
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-100",
        )}
        onClick={(event) => {
          event.stopPropagation();
          if (!isFlipped) return;
          onShowFront();
        }}
      >
        表
      </button>
      <button
        type="button"
        data-card-no-flip="true"
        aria-label="裏面を表示"
        aria-pressed={isFlipped}
        className={cn(
          itemClassName,
          isFlipped
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-100",
        )}
        onClick={(event) => {
          event.stopPropagation();
          if (isFlipped) return;
          onShowBack();
        }}
      >
        裏
      </button>
    </div>
  );
};



export { FaceSwitchBadge };


export type { FaceSwitchBadgeProps };
