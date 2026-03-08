import React from "react";
import { cn } from "@/lib/utils";

interface ListRowProps {
  left?: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  left,
  title,
  meta,
  right,
  onClick,
  className,
}: ListRowProps) {
  const clickable = typeof onClick === "function";

  return (
    <div
      className={cn(
        "h-11 flex items-center gap-2 border-b border-slate-100 last:border-b-0",
        clickable && "cursor-pointer hover:bg-slate-50/70 transition-colors",
        className,
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {left ? (
        <div className="shrink-0 min-w-[56px] flex items-center">{left}</div>
      ) : null}
      <div className="min-w-0 flex-1">
        <span className="text-sm text-slate-700 truncate block">{title}</span>
      </div>
      <div className="shrink-0 flex items-center">{right ?? meta}</div>
    </div>
  );
}




