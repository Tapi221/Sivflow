import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

type HoverEventTooltipProps = {
  title: string;
  subtitle?: string | null;
  children: ReactNode;
  side?: TooltipSide;
  offset?: number;
  className?: string;
  accentColor?: string;
  disabled?: boolean;
  editLabel?: string;
  onEdit?: () => void;
};

const TOOLTIP_SURFACE_CLASS_NAME = "relative flex max-w-[260px] flex-col gap-1.5 overflow-visible rounded-[14px] border border-white/70 bg-[rgba(255,255,255,0.84)] px-3 py-2.5 text-[#46515f] shadow-[0_14px_34px_rgba(74,90,110,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl";
const TOOLTIP_EDIT_BUTTON_CLASS_NAME = "-mr-1 -mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-transparent text-[#52616f] opacity-70 transition hover:bg-white/65 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8db9ff]/40";
const TOOLTIP_ARROW_CLASS_NAME = "absolute h-2.5 w-2.5 rotate-45 border-white/70 bg-[rgba(255,255,255,0.84)] backdrop-blur-2xl";
const TOOLTIP_VIEWPORT_MARGIN = 12;
const TOOLTIP_BOUNDARY_GAP = 8;
const TOOLTIP_ARROW_MARGIN = 18;
const TOOLTIP_CLOSE_DELAY_MS = 120;

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
  if (side === "bottom") return "top-[-4px] -translate-x-1/2 border-l border-t";

  return "bottom-[-4px] -translate-x-1/2 border-b border-r";
};

const HoverEventTooltip = ({
  title,
  subtitle,
  children,
  side = "top",
  offset = 10,
  className,
  accentColor = "#8db9ff",
  disabled = false,
  editLabel = "編集",
  onEdit,
}: HoverEventTooltipProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const tooltipTitle = title.trim();
  const tooltipSubtitle = subtitle?.trim();
  const hasContent = tooltipTitle.length > 0 || !!tooltipSubtitle;

  const clearCloseTimer = () => {
    if (closeTimerRef.current === null) return;

    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const hideTooltip = () => {
    clearCloseTimer();
    setPosition(null);
  };

  const scheduleHideTooltip = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setPosition(null);
    }, TOOLTIP_CLOSE_DELAY_MS);
  };

  const showTooltip = () => {
    clearCloseTimer();
    if (disabled || !hasContent || !anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    setPosition(getInitialPosition(rect, side, offset));
  };

  const handleEditButtonClick = () => {
    onEdit?.();
    hideTooltip();
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
    if (!position) return;

    const closeTooltip = () => {
      hideTooltip();
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

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  return (
    <>
      <div
        ref={anchorRef}
        className={cn("relative flex", className)}
        onMouseEnter={showTooltip}
        onMouseLeave={onEdit ? scheduleHideTooltip : hideTooltip}
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
              pointerEvents: onEdit ? "auto" : "none",
            }}
            className={cn(
              "animate-in fade-in-0 zoom-in-[0.98] duration-150 ease-out",
              !position.measured && "opacity-0",
            )}
            onMouseEnter={onEdit ? clearCloseTimer : undefined}
            onMouseLeave={onEdit ? hideTooltip : undefined}
          >
            <div className={TOOLTIP_SURFACE_CLASS_NAME}>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-[5px] h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.72)]"
                    style={{ background: accentColor }}
                  />

                  <span className="min-w-0 flex-1">
                    {tooltipTitle && (
                      <span className="block break-words text-[12px] font-semibold leading-snug tracking-[-0.01em] text-[#405162]">
                        {tooltipTitle}
                      </span>
                    )}

                    {tooltipSubtitle && (
                      <span className="mt-1 inline-flex rounded-full bg-[#f2f7fb]/90 px-2 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-[#6b8294]">
                        {tooltipSubtitle}
                      </span>
                    )}
                  </span>
                </div>

                {onEdit && (
                  <button type="button" className={TOOLTIP_EDIT_BUTTON_CLASS_NAME} aria-label={editLabel} title={editLabel} onClick={handleEditButtonClick}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-4" />
                      <path d="M18.5 3.5a2.1 2.1 0 0 1 3 3L12 16l-4 1 1-4 9.5-9.5Z" />
                      <path d="M15.5 6.5l2 2" />
                    </svg>
                  </button>
                )}
              </div>

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

HoverEventTooltip.displayName = "HoverEventTooltip";

export { HoverEventTooltip };
