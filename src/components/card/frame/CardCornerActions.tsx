import React, { useCallback } from "react";
import { Star } from "@/ui/icons";
import { CircleHelp } from "@/ui/icons";
import { cn } from "@/lib/utils";
import {
  CARD_ACTION_BG_CLASS,
  CARD_ACTION_COLOR_ACTIVE_CLASS,
  CARD_ACTION_COLOR_IDLE_CLASS,
  CARD_ACTION_ICON_CLASS,
} from "@/components/card/common/constants";

interface CardCornerActionsProps {
  onHelp?: () => void;
  onStar?: () => void;
  helpActive?: boolean;
  starActive?: boolean;
  disabled?: boolean;
  className?: string;
  iconPx?: number;
}

export const CardCornerActions = ({
  onHelp,
  onStar,
  helpActive = false,
  starActive = false,
  disabled = false,
  className,
  iconPx = 14,
}: CardCornerActionsProps) => {
  const stop = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);
  if (!onHelp && !onStar) return null;

  const buttonBaseClass =
    "rounded-full h-7 w-7 min-h-0 min-w-0 flex items-center justify-center bg-transparent hover:bg-transparent " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  const disabledClass = disabled ? "opacity-50 pointer-events-none" : "";
  const resolvedIconPx =
    typeof iconPx === "number" && Number.isFinite(iconPx) && iconPx > 0
      ? iconPx
      : 14;

  return (
    <div className={cn("flex items-center gap-0", className)}>
      {onHelp ? (
        <button
          type="button"
          aria-label="不確実フラグ"
          aria-pressed={helpActive}
          disabled={disabled}
          onPointerDown={stop}
          onMouseDown={stop}
          onKeyDown={stop}
          onClick={(e) => {
            e.stopPropagation();
            onHelp();
          }}
          className={cn(
            buttonBaseClass,
            disabledClass,
            CARD_ACTION_BG_CLASS,
            helpActive
              ? CARD_ACTION_COLOR_ACTIVE_CLASS
              : CARD_ACTION_COLOR_IDLE_CLASS,
          )}
        >
          <CircleHelp
            size={14}
            strokeWidth={1.2}
            className={cn(CARD_ACTION_ICON_CLASS, helpActive && "opacity-90")}
            style={{
              width: `${resolvedIconPx}px`,
              height: `${resolvedIconPx}px`,
            }}
          />
        </button>
      ) : null}

      {onStar ? (
        <button
          type="button"
          aria-label="ブックマーク"
          aria-pressed={starActive}
          disabled={disabled}
          onPointerDown={stop}
          onMouseDown={stop}
          onKeyDown={stop}
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className={cn(
            buttonBaseClass,
            disabledClass,
            CARD_ACTION_BG_CLASS,
            starActive
              ? CARD_ACTION_COLOR_ACTIVE_CLASS
              : CARD_ACTION_COLOR_IDLE_CLASS,
          )}
        >
          <Star
            size={14}
            strokeWidth={1.2}
            className={cn(CARD_ACTION_ICON_CLASS, starActive && "fill-none")}
            style={{
              width: `${resolvedIconPx}px`,
              height: `${resolvedIconPx}px`,
            }}
          />
        </button>
      ) : null}
    </div>
  );
};
