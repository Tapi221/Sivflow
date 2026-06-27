import React from "react";
import { cn } from "@web-renderer/lib/utils";
import { EXPLORER_ROW_BASE_CLASS_NAME, getExplorerRowStyle } from "./shared";



interface ExplorerRowProps extends React.HTMLAttributes<HTMLDivElement> {
  depth?: number;
  selected?: boolean;
  className?: string;
  rowRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}



const ExplorerRow = React.memo(({ depth, selected, className, rowRef, children, style, ...props }: ExplorerRowProps) => {
  return (<div ref={rowRef} className={cn(EXPLORER_ROW_BASE_CLASS_NAME, className)} data-depth={depth} data-selected={selected ? "true" : undefined} style={{ ...(depth === undefined ? {} : getExplorerRowStyle(depth)), ...style }} {...props} > {children} </div>);
});

export { ExplorerRow };
