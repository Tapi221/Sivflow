import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "bottom";

type TooltipPosition = {
  x: number;
  y: number;
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
};

const TOOLTIP_SURFACE_CLASS_NAME = "relative flex max-w-[260px] flex-col gap-1.5 overflow-visible rounded-[14px] border border-white/70 bg-[rgba(255,255,255,0.84)] px-3 py-2.5 text-[#46515f] shadow-[0_14px_34px_rgba(74,90,110,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl";
const TOOLTIP_ARROW_CLASS_NAME = "absolute h-2.5 w-2.5 rotate-45 border-white/70 bg-[rgba(255,255,255,0.84)] backdrop-blur-2xl";

const getPosition = (
  rect: DOMRect,
  side: TooltipSide,
  offset: number,
): TooltipPosition => {
  if (side === "bottom") {
    return {
      x: rect.left + rect.width / 2,
      y: rect.bottom + offset,
    };
  }

  return {
    x: rect.left + rect.width / 2,
    y: rect.top - offset,
  };
};

const getTransform = (side: TooltipSide) => {
  if (side === "bottom") return "translate(-50%, 0)";

  return "translate(-50%, -100%)";
};

const getArrowClassName = (side: TooltipSide) => {
  if (side === "bottom") return "top-[-4px] left-1/2 -translate-x-1/2 border-l border-t";

  return "bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r";
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
}: HoverEventTooltipProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const tooltipTitle = title.trim();
  const tooltipSubtitle = subtitle?.trim();
  const hasContent = tooltipTitle.length > 0 || !!tooltipSubtitle;

  const showTooltip = () => {
    if (disabled || !hasContent || !anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    setPosition(getPosition(rect, side, offset));
  };

  const hideTooltip = () => {
    setPosition(null);
  };

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
            role="tooltip"
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              transform: getTransform(side),
              zIndex: 9999,
              pointerEvents: "none",
            }}
            className="animate-in fade-in-0 zoom-in-[0.98] duration-150 ease-out"
          >
            <div className={TOOLTIP_SURFACE_CLASS_NAME}>
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

              <span className={cn(TOOLTIP_ARROW_CLASS_NAME, getArrowClassName(side))} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

HoverEventTooltip.displayName = "HoverEventTooltip";

export { HoverEventTooltip };
