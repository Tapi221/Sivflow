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
      <div
        className={cn(
          "sidebar-label ds-list-item__content flex-1 min-w-0",
          contentClassName,
        )}
      >
        {title ? (
          <div
            className={cn(
              "sidebar-title ds-list-item__title text-sm truncate",
              titleClassName,
            )}
          >
            {title}
          </div>
        ) : null}
        {subtitle ? (
          <div
            className={cn(
              "ds-list-item__subtitle text-[10px] truncate",
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
