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
  disabled?: boolean;
};

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
    return "bottom-[-3px] left-1/2 -translate-x-1/2";
  }

  if (side === "bottom") {
    return "top-[-3px] left-1/2 -translate-x-1/2";
  }

  if (side === "left") {
    return "right-[-3px] top-1/2 -translate-y-1/2";
  }

  return "left-[-3px] top-1/2 -translate-y-1/2";
};

export const HoverTooltip = ({
  label,
  children,
  side = "top",
  offset = 8,
  className,
  tooltipClassName,
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
        onFocus={showTooltip}
        onBlur={hideTooltip}
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
            className="animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div
              className={cn(
                "relative whitespace-nowrap rounded-md bg-[#24272f] px-2 py-1 text-[11px] font-medium leading-none text-white shadow-lg",
                tooltipClassName,
              )}
            >
              {tooltipLabel}

              <span
                className={cn(
                  "absolute h-2 w-2 rotate-45 bg-[#24272f]",
                  getArrowClassName(side),
                )}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};