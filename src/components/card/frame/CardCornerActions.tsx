import { useCallback } from "react";
import { CircleHelp, Star, Tag } from "@web-renderer/chip/icons/icons";
import { cn } from "@web-renderer/lib/utils";
import type { CSSProperties, SyntheticEvent } from "react";
import { CARD_ACTION_BG_CLASS, CARD_ACTION_BUTTON_PX, CARD_ACTION_COLOR_ACTIVE_CLASS, CARD_ACTION_COLOR_IDLE_CLASS, CARD_ACTION_ICON_CLASS, CARD_ACTION_ICON_PX } from "./cardAction.constants";



interface CardCornerActionsProps {
  onHelp?: () => void;
  onStar?: () => void;
  helpActive?: boolean;
  starActive?: boolean;
  disabled?: boolean;
  className?: string;
  visualScale?: number;
  iconPx?: number;
}



const resolveSafeVisualScale = (value?: number) => {
  if (typeof value !== "number") return 1;
  if (!Number.isFinite(value)) return 1;
  if (value <= 0) return 1;
  return value;
};
const resolveSafeIconPx = (value?: number) => {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return value;
};



const CardCornerActions = ({
  onHelp,
  onStar,
  helpActive = false,
  starActive = false,
  disabled = false,
  className,
  visualScale = 1,
  iconPx,
}: CardCornerActionsProps) => {
  const stop = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);
  if (!onHelp && !onStar) return null;
  const safeVisualScale = resolveSafeVisualScale(visualScale);
  const explicitIconPx = resolveSafeIconPx(iconPx);
  const resolvedIconPx = explicitIconPx ?? CARD_ACTION_ICON_PX / safeVisualScale;
  const resolvedButtonPx = CARD_ACTION_BUTTON_PX / safeVisualScale;
  const buttonBaseClass =
    "rounded-full min-h-0 min-w-0 flex items-center justify-center bg-transparent hover:bg-transparent " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  const disabledClass = disabled ? "opacity-50 pointer-events-none" : "";
  const buttonSizeStyle: CSSProperties = {
    width: `${resolvedButtonPx}px`,
    height: `${resolvedButtonPx}px`,
    minWidth: `${resolvedButtonPx}px`,
    minHeight: `${resolvedButtonPx}px`,
  };
  const iconSizeStyle: CSSProperties = {
    width: `${resolvedIconPx}px`,
    height: `${resolvedIconPx}px`,
  };
  return (
    <div className={cn("flex items-center gap-0", className)}>
      {onHelp !== undefined && (
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
      )}
      {onStar !== undefined && (
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
      )}
      {onStar !== undefined && (
        <span
          aria-hidden="true"
          className={cn(
            buttonBaseClass,
            disabledClass,
            CARD_ACTION_BG_CLASS,
            CARD_ACTION_COLOR_IDLE_CLASS,
          )}
          style={buttonSizeStyle}
          onPointerDown={stop}
          onMouseDown={stop}
          onClick={stop}
        >
          <Tag
            strokeWidth={1.2}
            className={CARD_ACTION_ICON_CLASS}
            style={iconSizeStyle}
          />
        </span>
      )}
    </div>
  );
};



export { CardCornerActions };
