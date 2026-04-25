import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export interface SectionListBlankPaneProps {
  className?: string;
  contentClassName?: string;
  sidebarWidth: number;
  topOffsetPx: number;
  leftInsetPx?: number;
  rightInsetPx?: number;
  children?: ReactNode;
}

/**
 * セクション一覧モードで、左サイドバー右側に表示するカラムビュー領域。
 * ワークスペースタブ配下では固定配置にせず、TreeViewLayout の一体型シェル内に収める。
 */
export const SectionListBlankPane = ({
  className,
  contentClassName,
  sidebarWidth,
  children,
}: SectionListBlankPaneProps) => {
  const hasContent = children !== undefined && children !== null;

  const style = {
    left: `${sidebarWidth}px`,
    right: 0,
    top: 0,
    bottom: 0,
  } satisfies CSSProperties;

  return (
    <div
      style={style}
      className={cn(
        "absolute z-0 hidden min-h-0 min-w-0 bg-transparent md:block",
        className,
      )}
    >
      <div
        aria-hidden={hasContent ? undefined : true}
        className={cn(
          "h-full min-h-0 w-full min-w-0 overflow-hidden",
          "border-l border-[#e6e4dc]",
          "bg-[rgba(255,255,255,0.96)]",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};
