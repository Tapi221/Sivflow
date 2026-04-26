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

const WORKSPACE_EXPLORER_TAB_WIDTH_VAR = "--workspace-explorer-tab-width";

const buildSidebarWidthFallback = (sidebarWidth: number): string => {
  const normalizedWidth = Number.isFinite(sidebarWidth)
    ? Math.max(0, Math.round(sidebarWidth))
    : 0;

  return `${normalizedWidth}px`;
};

/**
 * セクション一覧モードで、左サイドバー右側に表示するカラム/詳細ビュー領域。
 *
 * サイドバー幅は useTreeViewSidebar がリサイズ中に DOM と CSS 変数へ直接反映する。
 * React state の renderedSidebarWidth は pointerup まで更新されないため、ここで props の
 * sidebarWidth だけを見ると、ドラッグ中に右ペインの left が追従せず、サイドバーと
 * 右ペインが重なって見える。
 */
export const SectionListBlankPane = ({
  className,
  contentClassName,
  sidebarWidth,
  children,
}: SectionListBlankPaneProps) => {
  const hasContent = children !== undefined && children !== null;
  const sidebarWidthFallback = buildSidebarWidthFallback(sidebarWidth);

  const style = {
    left: `var(${WORKSPACE_EXPLORER_TAB_WIDTH_VAR}, ${sidebarWidthFallback})`,
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
