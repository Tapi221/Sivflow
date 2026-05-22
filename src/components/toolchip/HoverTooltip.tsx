import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "right" | "bottom" | "left";

type TooltipPosition = {
  x: number;
  y: number;
};

type HoverTooltipProps = {
  label?: string | null;
  children: ReactNode;
  side?: TooltipSide;
  offset?: number;
  className?: string;
  tooltipClassName?: string;
  arrowClassName?: string;
  disabled?: boolean;
};

const tooltipSurfaceClassName =
  "bg-[rgba(44,44,46,0.82)] backdrop-blur-xl";

const getTransform = (side: TooltipSide) => {
  if (side === "top") return "translate(-50%, -100%)";
  if (side === "bottom") return "translate(-50%, 0)";
  if (side === "left") return "translate(-100%, -50%)";
  return "translate(0, -50%)";
};

const getPosition = (
  rect: DOMRect,
  side: TooltipSide,
  offset: number,
): TooltipPosition => {
  if (side === "top") {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top - offset,
    };
  }

  if (side === "bottom") {
    return {
      x: rect.left + rect.width / 2,
      y: rect.bottom + offset,
    };
  }

  if (side === "left") {
    return {
      x: rect.left - offset,
      y: rect.top + rect.height / 2,
    };
  }

  return {
    x: rect.right + offset,
    y: rect.top + rect.height / 2,
  };
};

const getArrowClassName = (side: TooltipSide) => {
  if (side === "top") {
    return "bottom-[-4px] left-1/2 -translate-x-1/2";
  }

  if (side === "bottom") {
    return "top-[-4px] left-1/2 -translate-x-1/2";
  }

  if (side === "left") {
    return "right-[-4px] top-1/2 -translate-y-1/2";
  }

  return "left-[-4px] top-1/2 -translate-y-1/2";
};

const getArrowBorderClassName = (side: TooltipSide) => {
  if (side === "top") return "border-b border-r";
  if (side === "bottom") return "border-l border-t";
  if (side === "left") return "border-r border-t";

  return "border-b border-l";
};

export const HoverTooltip = ({
  label,
  children,
  side = "top",
  offset = 10,
  className,
  tooltipClassName,
  arrowClassName,
  disabled = false,
}: HoverTooltipProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const tooltipLabel = label?.trim();

  const showTooltip = () => {
    if (disabled || !tooltipLabel || !anchorRef.current) return;

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
        tooltipLabel &&
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
            className="animate-in fade-in-0 zoom-in-95 origin-center overflow-visible duration-200 ease-out will-change-transform"
          >
            <div
              className={cn(
                "relative inline-flex min-h-7 items-center overflow-visible whitespace-nowrap rounded-[13px] border border-white/20 px-3 py-1.5 text-[12px] font-semibold leading-[1.25] tracking-[-0.01em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.18)]",
                tooltipSurfaceClassName,
                tooltipClassName,
              )}
            >
              <span className="block overflow-visible leading-[inherit]">
                {tooltipLabel}
              </span>

              <span
                className={cn(
                  "absolute h-2.5 w-2.5 rotate-45 border-white/20",
                  tooltipSurfaceClassName,
                  getArrowClassName(side),
                  getArrowBorderClassName(side),
                  arrowClassName,
                )}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};