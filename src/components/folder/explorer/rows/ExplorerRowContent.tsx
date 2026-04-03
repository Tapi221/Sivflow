import { cn } from "@/lib/utils";
import React from "react";

interface ExplorerRowContentProps {
  left?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  contentClassName?: string;
}

export const ExplorerRowContent = React.memo(function ExplorerRowContent({
  left,
  title,
  subtitle,
  right,
  titleClassName,
  subtitleClassName,
  contentClassName,
}: ExplorerRowContentProps) {
  return (
    <>
      {left}
      <div className={cn("sidebar-label flex-1 min-w-0", contentClassName)}>
        {title ? (
          <div
            className={cn(
              "sidebar-title text-sm text-[var(--sidebar-text,#202123)] truncate",
              titleClassName,
            )}
          >
            {title}
          </div>
        ) : null}
        {subtitle ? (
          <div
            className={cn(
              "text-[10px] text-[var(--sidebar-text-muted,#6e6e80)] truncate",
              subtitleClassName,
            )}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {right}
    </>
  );
});
