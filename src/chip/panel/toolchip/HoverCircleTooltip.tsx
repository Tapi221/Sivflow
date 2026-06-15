import type { ReactNode } from "react";
import { cn } from "@/lib/utils";



type HoverCircleTooltipProps = {
  label?: string | null;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
};



const hoverCircleTooltipClassName = cn(
  "pointer-events-none absolute left-1/2 top-[calc(100%+9px)] z-20 -translate-x-1/2 whitespace-nowrap rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.78)] px-3 py-1.5 text-xs font-semibold leading-none tracking-tight text-[#3c3c43]/80 opacity-0 shadow-[0_10px_30px_rgba(60,60,67,0.16),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-2xl",
  "group-hover/action:opacity-100 group-focus-visible/action:opacity-100",
);



const HoverCircleTooltip = ({ label, children, className, disabled = false }: HoverCircleTooltipProps) => {
  const tooltipLabel = label?.trim();
  const content = children ?? tooltipLabel;

  if (disabled || (content === null || content === undefined) || content === "") return null;

  return (
    <span className={cn(hoverCircleTooltipClassName, className)}>
      {content}
    </span>
  );
};



export { HoverCircleTooltip };
