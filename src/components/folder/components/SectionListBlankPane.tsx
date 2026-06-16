import { cn } from "@web-renderer/lib/utils";
import type { CSSProperties, ReactNode } from "react";



interface SectionListBlankPaneProps {
  className?: string;
  contentClassName?: string;
  sidebarWidth: number;
  topOffsetPx: number;
  leftInsetPx?: number;
  rightInsetPx?: number;
  children?: ReactNode;
}



const SECTION_LIST_PANE_LEFT_VAR = "--sivflow-section-list-pane-left";



const buildSidebarWidthFallback = (sidebarWidth: number): string => {
  const normalizedWidth = Number.isFinite(sidebarWidth)
    ? Math.max(0, Math.round(sidebarWidth))
    : 0;

  return `${normalizedWidth}px`;
};



const SectionListBlankPane = ({
  className,
  contentClassName,
  sidebarWidth,
  children,
}: SectionListBlankPaneProps) => {
  const hasContent = children !== undefined && children !== null;
  const sidebarWidthFallback = buildSidebarWidthFallback(sidebarWidth);
  const normalizedSidebarWidth = Number.isFinite(sidebarWidth)
    ? Math.max(0, Math.round(sidebarWidth))
    : 0;

  const style = {
    left:
      normalizedSidebarWidth === 0
        ? "0px"
        : `var(${SECTION_LIST_PANE_LEFT_VAR}, ${sidebarWidthFallback})`,
    right: 0,
    top: 0,
    bottom: 0,
  } satisfies CSSProperties;

  return (
    <div
      style={style}
      className={cn(
        "section-list-blank-pane absolute z-0 block min-h-0 min-w-0 bg-transparent",
        className,
      )}
    >
      <div
        aria-hidden={hasContent ? undefined : true}
        className={cn(
          "h-full min-h-0 w-full min-w-0 overflow-hidden",
          "bg-white",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};



export { SectionListBlankPane };
