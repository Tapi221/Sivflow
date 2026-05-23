import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  TOOLTIP_SIZE_CLASS_NAMES,
  type TooltipSize,
} from "@/components/toolchip/tooltip.size";

type TooltipSide = "top" | "right" | "bottom" | "left";
type TooltipAlign = "center" | "start" | "end";

type TooltipPosition = {
  x: number;
  y: number;
};

type HoverTooltipProps = {
  label?: string | null;
  children: ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  offset?: number;
  className?: string;
  tooltipClassName?: string;
  arrowClassName?: string;
  size?: TooltipSize;
  disabled?: boolean;
};

const tooltipSurfaceClassName = "bg-[#1c1c1e]/95 backdrop-blur-md";

const getTransform = (side: TooltipSide, align: TooltipAlign) => {
  if (side === "top") {
    if (align === "start") return "translate(0, -100%)";
    if (align === "end") return "translate(-100%, -100%)";
    return "translate(-50%, -100%)";
  }

  if (side === "bottom") {
    if (align === "start") return "translate(0, 0)";
    if (align === "end") return "translate(-100%, 0)";
    return "translate(-50%, 0)";
  }

  if (side === "left") {
    if (align === "start") return "translate(-100%, 0)";
    if (align === "end") return "translate(-100%, -100%)";
    return "translate(-100%, -50%)";
  }

  if (align === "start") return "translate(0, 0)";
  if (align === "end") return "translate(0, -100%)";
  return "translate(0, -50%)";
};

const getPosition = (
  rect: DOMRect,
  side: TooltipSide,
  offset: number,
  align: TooltipAlign,
): TooltipPosition => {
  if (side === "top") {
    return {
      x:
        align === "start"
          ? rect.left
          : align === "end"
            ? rect.right
            : rect.left + rect.width / 2,
      y: rect.top - offset,
    };
  }

  if (side === "bottom") {
    return {
      x:
        align === "start"
          ? rect.left
          : align === "end"
            ? rect.right
            : rect.left + rect.width / 2,
      y: rect.bottom + offset,
    };
  }

  if (side === "left") {
    return {
      x: rect.left - offset,
      y:
        align === "start"
          ? rect.top
          : align === "end"
            ? rect.bottom
            : rect.top + rect.height / 2,
    };
  }

  return {
    x: rect.right + offset,
    y:
      align === "start"
        ? rect.top
        : align === "end"
          ? rect.bottom
          : rect.top + rect.height / 2,
  };
};

const getArrowClassName = (side: TooltipSide, align: TooltipAlign) => {
  if (side === "top") {
    return cn(
      "bottom-[-3px]",
      align === "start"
        ? "left-4"
        : align === "end"
          ? "right-4"
          : "left-1/2 -translate-x-1/2",
    );
  }

  if (side === "bottom") {
    return cn(
      "top-[-3px]",
      align === "start"
        ? "left-4"
        : align === "end"
          ? "right-4"
          : "left-1/2 -translate-x-1/2",
    );
  }

  if (side === "left") {
    return cn(
      "right-[-3px]",
      align === "start"
        ? "top-4"
        : align === "end"
          ? "bottom-4"
          : "top-1/2 -translate-y-1/2",
    );
  }

  return cn(
    "left-[-3px]",
    align === "start"
      ? "top-4"
      : align === "end"
        ? "bottom-4"
        : "top-1/2 -translate-y-1/2",
  );
};

export const HoverTooltip = ({
  label,
  children,
  side = "top",
  align = "center",
  offset = 8,
  className,
  tooltipClassName,
  arrowClassName,
  size = "default",
  disabled = false,
}: HoverTooltipProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const tooltipLabel = label?.trim();
  const sizeClassNames = TOOLTIP_SIZE_CLASS_NAMES[size];

  const showTooltip = () => {
    if (disabled || !tooltipLabel || !anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    setPosition(getPosition(rect, side, offset, align));
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
              transform: getTransform(side, align),
              zIndex: 9999,
              pointerEvents: "none",
            }}
            className="animate-in fade-in-0 zoom-in-[0.98] overflow-visible duration-150 ease-out"
          >
            <div
              className={cn(
                "relative inline-flex items-center overflow-visible whitespace-nowrap font-medium tracking-[-0.01em] text-white",
                sizeClassNames.tooltip,
                tooltipSurfaceClassName,
                tooltipClassName,
              )}
            >
              <span className="block overflow-visible leading-[inherit]">
                {tooltipLabel}
              </span>

              <span
                className={cn(
                  "absolute rotate-45",
                  sizeClassNames.arrow,
                  tooltipSurfaceClassName,
                  getArrowClassName(side, align),
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