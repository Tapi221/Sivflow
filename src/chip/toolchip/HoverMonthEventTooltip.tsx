import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { emitHoverTooltipOpen, subscribeHoverTooltipOpen } from "@/chip/toolchip/hoverTooltipEvents";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "bottom";
type TooltipPosition = {
  x: number;
  y: number;
  side: TooltipSide;
  arrowX: number;
  measured: boolean;
};
type TooltipBoundary = {
  top: number;
  bottom: number;
};
type HoverMonthEventTooltipProps = {
  title: string;
  timeLabel?: string | null;
  children: ReactNode;
  side?: TooltipSide;
  offset?: number;
  className?: string;
  accentColor?: string;
  disabled?: boolean;
};

const TOOLTIP_SURFACE_CLASS_NAME = "relative flex w-fit max-w-56 flex-col overflow-visible rounded-xl border border-sky-100/80 bg-sky-50/95 px-2.5 py-1.5 text-slate-600 shadow-lg backdrop-blur-xl";
const TOOLTIP_TITLE_ROW_CLASS_NAME = "flex min-w-0 items-center gap-1.5";
const TOOLTIP_ACCENT_DOT_CLASS_NAME = "h-1.5 w-1.5 shrink-0 rounded-full";
const TOOLTIP_TITLE_CLASS_NAME = "block min-w-0 whitespace-normal break-words text-xs font-semibold leading-snug tracking-tight text-slate-700";
const TOOLTIP_ARROW_CLASS_NAME = "absolute h-2 w-2 rotate-45 border-sky-100/80 bg-sky-50/95 backdrop-blur-xl";
const TOOLTIP_VIEWPORT_MARGIN = 12;
const TOOLTIP_BOUNDARY_GAP = 8;
const TOOLTIP_ARROW_MARGIN = 12;

const clampNumber = (value: number, min: number, max: number) => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};
const getScrollBoundary = (element: HTMLElement): TooltipBoundary => {
  let current = element.parentElement;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflow = `${style.overflow}${style.overflowX}${style.overflowY}`;
    if (/(auto|scroll|overlay)/.test(overflow)) {
      const rect = current.getBoundingClientRect();
      return {
        top: Math.max(TOOLTIP_VIEWPORT_MARGIN, rect.top + TOOLTIP_BOUNDARY_GAP),
        bottom: Math.min(
          window.innerHeight - TOOLTIP_VIEWPORT_MARGIN,
          rect.bottom - TOOLTIP_BOUNDARY_GAP,
        ),
      };
    }
    current = current.parentElement;
  }
  return {
    top: TOOLTIP_VIEWPORT_MARGIN,
    bottom: window.innerHeight - TOOLTIP_VIEWPORT_MARGIN,
  };
};
const resolveSide = (
  preferredSide: TooltipSide,
  anchorRect: DOMRect,
  tooltipHeight: number,
  offset: number,
  boundary: TooltipBoundary,
) => {
  const neededSpace = tooltipHeight + offset;
  const spaceAbove = anchorRect.top - boundary.top;
  const spaceBelow = boundary.bottom - anchorRect.bottom;
  if (preferredSide === "top") {
    if (spaceAbove >= neededSpace || spaceAbove >= spaceBelow) return "top";
    return "bottom";
  }
  if (spaceBelow >= neededSpace || spaceBelow >= spaceAbove) return "bottom";
  return "top";
};
const resolvePosition = (
  anchorRect: DOMRect,
  tooltipRect: DOMRect,
  preferredSide: TooltipSide,
  offset: number,
  boundary: TooltipBoundary,
): TooltipPosition => {
  const side = resolveSide(preferredSide, anchorRect, tooltipRect.height, offset, boundary);
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const x = clampNumber(
    anchorCenterX - tooltipRect.width / 2,
    TOOLTIP_VIEWPORT_MARGIN,
    window.innerWidth - tooltipRect.width - TOOLTIP_VIEWPORT_MARGIN,
  );
  const preferredY =
    side === "top"
      ? anchorRect.top - tooltipRect.height - offset
      : anchorRect.bottom + offset;
  const y = clampNumber(preferredY, boundary.top, boundary.bottom - tooltipRect.height);
  const arrowX = clampNumber(
    anchorCenterX - x,
    TOOLTIP_ARROW_MARGIN,
    tooltipRect.width - TOOLTIP_ARROW_MARGIN,
  );
  return { x, y, side, arrowX, measured: true };
};
const getInitialPosition = (
  anchorRect: DOMRect,
  preferredSide: TooltipSide,
  offset: number,
): TooltipPosition => {
  const x = anchorRect.left + anchorRect.width / 2;
  const y = preferredSide === "top" ? anchorRect.top - offset : anchorRect.bottom + offset;
  return { x, y, side: preferredSide, arrowX: 0, measured: false };
};
const getArrowClassName = (side: TooltipSide) => {
  if (side === "bottom") return "-top-0.5 -translate-x-1/2 border-l border-t";
  return "-bottom-0.5 -translate-x-1/2 border-b border-r";
};

const HoverMonthEventTooltip = ({
  title,
  timeLabel,
  children,
  side = "top",
  offset = 8,
  className,
  accentColor = "#8ed8e8",
  disabled = false,
}: HoverMonthEventTooltipProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipIdRef = useRef(Symbol("hover-month-event-tooltip"));
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const tooltipTitle = title.trim();
  const tooltipTimeLabel = timeLabel?.trim();
  const hasContent = tooltipTitle.length > 0 || !!tooltipTimeLabel;
  const showTooltip = () => {
    if (disabled || !hasContent || !anchorRef.current) return;
    emitHoverTooltipOpen(tooltipIdRef.current);
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition(getInitialPosition(rect, side, offset));
  };
  const hideTooltip = () => {
    setPosition(null);
  };
  useLayoutEffect(() => {
    if (!position || !anchorRef.current || !tooltipRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const boundary = getScrollBoundary(anchorRef.current);
    const nextPosition = resolvePosition(anchorRect, tooltipRect, side, offset, boundary);
    setPosition((currentPosition) => {
      if (
        currentPosition?.measured &&
        currentPosition.x === nextPosition.x &&
        currentPosition.y === nextPosition.y &&
        currentPosition.side === nextPosition.side &&
        currentPosition.arrowX === nextPosition.arrowX
      ) {
        return currentPosition;
      }
      return nextPosition;
    });
  }, [offset, position, side]);
  useEffect(() => {
    return subscribeHoverTooltipOpen((tooltipId) => {
      if (tooltipId === tooltipIdRef.current) return;
      hideTooltip();
    });
  }, []);
  useEffect(() => {
    if (!position) return;
    const closeTooltip = () => {
      setPosition(null);
    };
    window.addEventListener("scroll", closeTooltip, true);
    window.addEventListener("resize", closeTooltip);
    return () => {
      window.removeEventListener("scroll", closeTooltip, true);
      window.removeEventListener("resize", closeTooltip);
    };
  }, [position]);
  useEffect(() => {
    if (!disabled && hasContent) return;
    hideTooltip();
  }, [disabled, hasContent]);
  return (
    <>
      <div
        ref={anchorRef}
        className={cn("relative flex", className)}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>
      {position &&
        hasContent &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              zIndex: 9999,
              pointerEvents: "none",
            }}
            className={cn(
              "animate-in fade-in-0 slide-in-from-bottom-1 zoom-in-95 duration-150 ease-out",
              !position.measured && "opacity-0",
            )}
          >
            <div className={TOOLTIP_SURFACE_CLASS_NAME}>
              {tooltipTitle && (
                <span className={TOOLTIP_TITLE_ROW_CLASS_NAME}>
                  <span
                    aria-hidden="true"
                    className={TOOLTIP_ACCENT_DOT_CLASS_NAME}
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className={TOOLTIP_TITLE_CLASS_NAME}>
                    {tooltipTitle}
                  </span>
                </span>
              )}
              {tooltipTimeLabel && (
                <span className="mt-1 inline-flex w-fit rounded-full border border-white/80 bg-white/75 px-1.5 py-0.5 text-xs font-semibold leading-none tabular-nums text-slate-500 shadow-inner">
                  {tooltipTimeLabel}
                </span>
              )}
              <span
                className={cn(TOOLTIP_ARROW_CLASS_NAME, getArrowClassName(position.side))}
                style={{ left: position.arrowX }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
HoverMonthEventTooltip.displayName = "HoverMonthEventTooltip";

export { HoverMonthEventTooltip };
