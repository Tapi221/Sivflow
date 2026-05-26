import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "right" | "bottom" | "left";

type TooltipPosition = {
  x: number;
  y: number;
};

export type HoverSuggestionItem = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

type HoverSuggestionTooltipProps = {
  children: ReactNode;
  items: HoverSuggestionItem[];
  side?: TooltipSide;
  offset?: number;
  title?: string;
  emptyLabel?: string;
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
    return { x: rect.left + rect.width / 2, y: rect.top - offset };
  }

  if (side === "bottom") {
    return { x: rect.left + rect.width / 2, y: rect.bottom + offset };
  }

  if (side === "left") {
    return { x: rect.left - offset, y: rect.top + rect.height / 2 };
  }

  return { x: rect.right + offset, y: rect.top + rect.height / 2 };
};

const getArrowClassName = (side: TooltipSide) => {
  if (side === "top") return "bottom-[-3px] left-1/2 -translate-x-1/2";
  if (side === "bottom") return "top-[-3px] left-1/2 -translate-x-1/2";
  if (side === "left") return "right-[-3px] top-1/2 -translate-y-1/2";

  return "left-[-3px] top-1/2 -translate-y-1/2";
};

export const HoverSuggestionTooltip = ({
  children,
  items,
  side = "right",
  offset = 10,
  title,
  emptyLabel,
  className,
  tooltipClassName,
  disabled = false,
}: HoverSuggestionTooltipProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const visibleItems = items.filter((item) => item.label.trim().length > 0);
  const hasContent = visibleItems.length > 0 || emptyLabel;

  const clearCloseTimer = () => {
    if (!closeTimerRef.current) return;

    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const showTooltip = () => {
    if (disabled || !hasContent || !anchorRef.current) return;

    clearCloseTimer();

    const rect = anchorRef.current.getBoundingClientRect();
    setPosition(getPosition(rect, side, offset));
  };

  const hideTooltip = () => {
    clearCloseTimer();

    closeTimerRef.current = setTimeout(() => {
      setPosition(null);
    }, 90);
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
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>

      {position &&
        hasContent &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="menu"
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              transform: getTransform(side),
              zIndex: 9999,
              pointerEvents: "auto",
            }}
            className="animate-in fade-in-0 zoom-in-95 duration-150"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={hideTooltip}
          >
            <div
              className={cn(
                "relative min-w-[180px] rounded-xl border border-[#e6e8ee] bg-white p-1.5 text-[#24272f] shadow-[0_12px_32px_rgba(20,22,30,0.16)]",
                tooltipClassName,
              )}
            >
              {title && (
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
                  {title}
                </div>
              )}

              {visibleItems.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => {
                        if (item.disabled) return;

                        item.onClick?.();
                        setPosition(null);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                        "hover:bg-[#f1f3f7]",
                        item.disabled &&
                          "cursor-not-allowed opacity-45 hover:bg-transparent",
                      )}
                    >
                      {item.icon && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#74798b]">
                          {item.icon}
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium leading-tight text-[#2d3039]">
                          {item.label}
                        </span>

                        {item.description && (
                          <span className="mt-0.5 block truncate text-[10px] leading-tight text-[#9aa0aa]">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-1.5 text-[11px] text-[#9aa0aa]">
                  {emptyLabel}
                </div>
              )}

              <span
                className={cn(
                  "absolute h-2 w-2 rotate-45 border-[#e6e8ee] bg-white",
                  side === "top" && "border-b border-r",
                  side === "bottom" && "border-l border-t",
                  side === "left" && "border-r border-t",
                  side === "right" && "border-b border-l",
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