import React, { useCallback } from "react";
import { Star, CircleHelp } from "@/ui/icons";
import { cn } from "@/lib/utils";
import {
  CARD_ACTION_BG_CLASS,
  CARD_ACTION_COLOR_ACTIVE_CLASS,
  CARD_ACTION_COLOR_IDLE_CLASS,
  CARD_ACTION_ICON_CLASS,
} from "@constants/shared/flashcard";

interface CardCornerActionsProps {
  onHelp?: () => void;
  onStar?: () => void;
  helpActive?: boolean;
  starActive?: boolean;
  disabled?: boolean;
  className?: string;
  visualScale?: number;
}

const resolveSafeVisualScale = (value?: number) => {
  if (typeof value !== "number") return 1;
  if (!Number.isFinite(value)) return 1;
  if (value <= 0) return 1;
  return value;
};

export const CardCornerActions = ({
  onHelp,
  onStar,
  helpActive = false,
  starActive = false,
  disabled = false,
  className,
  visualScale = 1,
}: CardCornerActionsProps) => {
  const stop = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  if (!onHelp && !onStar) return null;

  const safeVisualScale = resolveSafeVisualScale(visualScale);
  const resolvedButtonPx = 28 / safeVisualScale;
  const resolvedIconPx = 14 / safeVisualScale;

  const buttonBaseClass =
    "rounded-full min-h-0 min-w-0 flex items-center justify-center bg-transparent hover:bg-transparent " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  const disabledClass = disabled ? "opacity-50 pointer-events-none" : "";
  const buttonSizeStyle: React.CSSProperties = {
    width: `${resolvedButtonPx}px`,
    height: `${resolvedButtonPx}px`,
    minWidth: `${resolvedButtonPx}px`,
    minHeight: `${resolvedButtonPx}px`,
  };
  const iconSizeStyle: React.CSSProperties = {
    width: `${resolvedIconPx}px`,
    height: `${resolvedIconPx}px`,
  };

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
          onClick={(event) => {
            event.stopPropagation();
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
          style={buttonSizeStyle}
        >
          <CircleHelp
            strokeWidth={1.2}
            className={cn(CARD_ACTION_ICON_CLASS, helpActive && "opacity-90")}
            style={iconSizeStyle}
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
          onClick={(event) => {
            event.stopPropagation();
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
          style={buttonSizeStyle}
        >
          <Star
            strokeWidth={1.2}
            className={cn(CARD_ACTION_ICON_CLASS, starActive && "fill-none")}
            style={iconSizeStyle}
          />
        </button>
      ) : null}
    </div>
  );
};