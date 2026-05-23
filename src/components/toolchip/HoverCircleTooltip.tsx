import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type HoverCircleTooltipProps = {
  label?: string | null;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
};

export const hoverCircleTooltipClassName = cn(
  "pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full border border-[#d1d1d6]/70 bg-white/95 px-2.5 py-1 text-[11px] font-medium leading-none tracking-[-0.01em] text-[#3c3c43]/72 opacity-0 shadow-[0_8px_18px_rgba(60,60,67,0.12)] backdrop-blur-xl transition-all duration-150 ease-out",
  "group-hover/action:translate-y-0 group-hover/action:opacity-100 group-focus-visible/action:translate-y-0 group-focus-visible/action:opacity-100 motion-reduce:transition-none",
);

export const HoverCircleTooltip = ({
  label,
  children,
  className,
  disabled = false,
}: HoverCircleTooltipProps) => {
  const tooltipLabel = label?.trim();
  const content = children ?? tooltipLabel;

  if (disabled || content == null || content === "") return null;

  return (
    <span className={cn(hoverCircleTooltipClassName, className)}>
      {content}
    </span>
  );
};
