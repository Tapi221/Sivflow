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
}

export function CardCornerActions({
  onHelp,
  onStar,
  helpActive = false,
  starActive = false,
  disabled = false,
  className,
}: CardCornerActionsProps) {
  if (!onHelp && !onStar) return null;

  const stop = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  const buttonBaseClass =
    "rounded-full h-7 w-7 min-h-0 min-w-0 transition-colors flex items-center justify-center bg-transparent hover:bg-transparent active:bg-transparent " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  const disabledClass = disabled ? "opacity-50 pointer-events-none" : "";

  return (
    <div className={cn("flex items-center gap-1", className)}>
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
            className={cn(CARD_ACTION_ICON_CLASS, helpActive && "opacity-90")}
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
            className={cn(CARD_ACTION_ICON_CLASS, starActive && "fill-current")}
          />
        </button>
      ) : null}
    </div>
  );
}
