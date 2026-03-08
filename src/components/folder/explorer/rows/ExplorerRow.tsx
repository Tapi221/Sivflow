import React from "react";
import { cn } from "@/lib/utils";
import { EXPLORER_ROW_BASE_CLASS_NAME, getExplorerRowStyle } from "./shared";

interface ExplorerRowProps extends React.HTMLAttributes<HTMLDivElement> {
  depth: number;
  selected?: boolean;
  className?: string;
  rowRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}

export const ExplorerRow: React.FC<ExplorerRowProps> = ({
  depth,
  selected,
  className,
  rowRef,
  children,
  style,
  ...props
}) => (
  <div
    ref={rowRef}
    className={cn(EXPLORER_ROW_BASE_CLASS_NAME, className)}
    data-selected={selected ? "true" : undefined}
    style={{ ...getExplorerRowStyle(depth), ...style }}
    {...props}
  >
    {children}
  </div>
);



