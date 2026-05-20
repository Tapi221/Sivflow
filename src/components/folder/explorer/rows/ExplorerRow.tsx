import React from "react";

import { EXPLORER_ROW_BASE_CLASS_NAME, getExplorerRowStyle } from "./shared";

import { cn } from "@/lib/utils";

interface ExplorerRowProps extends React.HTMLAttributes<HTMLDivElement> {
  depth?: number;
  selected?: boolean;
  className?: string;
  rowRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}

export const ExplorerRow = React.memo(function ExplorerRow({
  depth,
  selected,
  className,
  rowRef,
  children,
  style,
  ...props
}: ExplorerRowProps) {
  return (
    <div
      ref={rowRef}
      className={cn(EXPLORER_ROW_BASE_CLASS_NAME, className)}
      data-selected={selected ? "true" : undefined}
      style={{
        ...(depth === undefined ? {} : getExplorerRowStyle(depth)),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});
